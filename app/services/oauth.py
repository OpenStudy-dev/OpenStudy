"""OAuth 2.1 authorization server storage helpers (Postgres-backed).

Phase 0 (single-operator) deployment: the operator (server admin) authenticates
via the existing dashboard password cookie during the consent step. Users as a
distinct database concept are introduced in Phase 1 — until then every issued
token implicitly belongs to the operator.
"""
from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import urlsplit
from uuid import UUID

from .. import db
from ..config import get_settings


AUTH_CODE_TTL_SEC = 600  # 10 min

# http:// is only acceptable on loopback — that's how local MCP dev servers
# and CLI tools receive their callback. Everything else must be https.
_LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})


def _gen(n: int = 32) -> str:
    return secrets.token_urlsafe(n)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────── Clients ───────────────────────

def redirect_uri_error(uri: object) -> Optional[str]:
    """Return None if `uri` is acceptable for registration, else a short
    human-readable reason.

    Open DCR means the URI is attacker-supplied. We can't allow-list (the
    whole point of DCR is that clients we've never heard of can register)
    but we can refuse the shapes that only ever serve an attacker:
    non-https on a real host, fragments, wildcards, non-absolute URIs.
    """
    if not isinstance(uri, str):
        return "must be a string"
    if not uri or uri != uri.strip():
        return "must be non-empty with no surrounding whitespace"
    if len(uri) > 2048:
        return "too long (max 2048)"
    if "*" in uri:
        return "wildcards are not allowed"
    parts = urlsplit(uri)
    if parts.scheme not in ("http", "https"):
        return "scheme must be https"
    if parts.fragment or uri.endswith("#"):
        return "must not contain a fragment"
    host = (parts.hostname or "").lower()
    if not host:
        return "must be an absolute URI with a host"
    if parts.scheme == "https":
        return None
    if host in _LOOPBACK_HOSTS:
        return None
    return "http is only allowed for loopback (localhost / 127.0.0.1 / ::1); use https"


def redirect_uri_matches(requested: str, registered: list[str]) -> bool:
    """True if `requested` is one of the client's registered redirect URIs.

    Exact string match, with one exception from RFC 8252 §7.3: for loopback
    hosts the port is ignored, because native clients (Claude Code, CLI
    tools) bind whatever local port is free at login time and may not get
    the one they registered with. Scheme, host, path and query must still
    match exactly.
    """
    if requested in registered:
        return True
    try:
        req = urlsplit(requested)
        req.port  # raises ValueError on a malformed port
    except ValueError:
        return False
    host = (req.hostname or "").lower()
    if host not in _LOOPBACK_HOSTS:
        return False
    for uri in registered:
        try:
            reg = urlsplit(uri)
            reg.port
        except ValueError:
            continue
        if (
            reg.scheme == req.scheme
            and (reg.hostname or "").lower() == host
            and reg.path == req.path
            and reg.query == req.query
            and not req.fragment
        ):
            return True
    return False


async def create_client(
    *,
    client_name: str,
    redirect_uris: list[str],
    token_endpoint_auth_method: str = "none",
    public: bool = True,
) -> dict[str, Any]:
    client_id = _gen(16)
    client_secret = None if public else _gen(32)
    row = await db.fetchrow(
        "INSERT INTO oauth_clients "
        "(client_id, client_secret, client_name, redirect_uris, "
        " token_endpoint_auth_method) "
        "VALUES (%s, %s, %s, %s, %s) RETURNING *",
        client_id, client_secret, client_name, redirect_uris,
        token_endpoint_auth_method,
    )
    if row is None:
        raise ValueError(f"failed to register client '{client_name}'")
    return row


async def get_client(client_id: str) -> Optional[dict[str, Any]]:
    return await db.fetchrow(
        "SELECT * FROM oauth_clients WHERE client_id = %s LIMIT 1",
        client_id,
    )


# ─────────────────────── Auth codes ───────────────────────

async def create_auth_code(
    *,
    user_id: UUID,
    client_id: str,
    redirect_uri: str,
    code_challenge: str,
    code_challenge_method: str,
    scope: Optional[str],
) -> str:
    code = _gen(32)
    expires_at = _now() + timedelta(seconds=AUTH_CODE_TTL_SEC)
    await db.execute(
        "INSERT INTO oauth_auth_codes "
        "(user_id, code, client_id, redirect_uri, code_challenge, "
        " code_challenge_method, scope, expires_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        user_id, code, client_id, redirect_uri, code_challenge,
        code_challenge_method, scope, expires_at,
    )
    return code


async def consume_auth_code(
    code: str, client_id: str, redirect_uri: str, code_verifier: str
) -> Optional[dict[str, Any]]:
    """Validate + invalidate the auth code in one shot. Returns the row on
    success, else None.

    Atomicity matters: a single `DELETE … RETURNING *` removes the row from
    the table at the same instant we read it, so two parallel callers can
    never both succeed with the same code (the second one's DELETE matches
    zero rows). This is stricter than the previous SELECT-then-UPDATE form
    which had a TOCTOU window.

    Validation order:
      1. DELETE the row if it exists AND has not expired (single SQL stmt).
      2. Then verify client_id / redirect_uri / PKCE challenge in Python.
    If any post-DELETE check fails the code is gone anyway — that's
    deliberate, the row is treated as burnt the moment it's looked up.
    """
    row = await db.fetchrow(
        "DELETE FROM oauth_auth_codes "
        "WHERE code = %s AND expires_at > now() "
        "RETURNING *",
        code,
    )
    if row is None:
        return None
    if row["client_id"] != client_id or row["redirect_uri"] != redirect_uri:
        return None

    # OAuth 2.1 mandates S256 — `plain` is rejected even if a code row
    # somehow ended up stored with method='plain' (the /authorize handler
    # already blocks it, but a direct POST to /oauth/consent skipped that
    # check until this guard was added).
    if row["code_challenge_method"] != "S256":
        return None
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    computed = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    if computed != row["code_challenge"]:
        return None

    return row


# ─────────────────────── Access tokens ───────────────────────

async def create_access_token(user_id: UUID, client_id: str, scope: Optional[str]) -> tuple[str, int]:
    token = _gen(48)
    ttl_sec = get_settings().oauth_token_ttl_days * 24 * 60 * 60
    expires_at = _now() + timedelta(seconds=ttl_sec)
    await db.execute(
        "INSERT INTO oauth_tokens "
        "(user_id, token, client_id, scope, expires_at) VALUES (%s, %s, %s, %s, %s)",
        user_id, token, client_id, scope, expires_at,
    )
    return token, ttl_sec


async def verify_access_token(token: str) -> Optional[dict[str, Any]]:
    """Return the token row if it's known, not revoked, and not expired."""
    row = await db.fetchrow(
        "SELECT * FROM oauth_tokens "
        "WHERE token = %s AND revoked = false "
        "  AND (expires_at IS NULL OR expires_at > now()) "
        "LIMIT 1",
        token,
    )
    return row


async def revoke_token(token: str) -> None:
    """Mark an access token as revoked. After this, verify_access_token
    returns None for the token. No-op if the token doesn't exist."""
    await db.execute(
        "UPDATE oauth_tokens SET revoked = true WHERE token = %s",
        token,
    )


__all__ = [
    "redirect_uri_error",
    "redirect_uri_matches",
    "create_client",
    "get_client",
    "create_auth_code",
    "consume_auth_code",
    "create_access_token",
    "verify_access_token",
    "revoke_token",
]
