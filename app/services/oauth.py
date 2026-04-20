"""OAuth 2.1 authorization server storage helpers (Supabase-backed).

Single-user personal server: the only "user" is the deploy owner, authenticated
via the existing dashboard password cookie during the consent step. We don't
model users as a separate concept — every issued token implicitly belongs to them.
"""
from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from ..db import supabase


AUTH_CODE_TTL_SEC = 600  # 10 min
ACCESS_TOKEN_TTL_SEC = 90 * 24 * 60 * 60  # 90 days


def _gen(n: int = 32) -> str:
    return secrets.token_urlsafe(n)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_ts(v: str) -> datetime:
    return datetime.fromisoformat(v.replace("Z", "+00:00"))


# ─────────────────────── Clients ───────────────────────

def create_client(
    *,
    client_name: str,
    redirect_uris: list[str],
    token_endpoint_auth_method: str = "none",
    public: bool = True,
) -> dict[str, Any]:
    client_id = _gen(16)
    client_secret = None if public else _gen(32)
    resp = (
        supabase()
        .table("oauth_clients")
        .insert(
            {
                "client_id": client_id,
                "client_secret": client_secret,
                "client_name": client_name,
                "redirect_uris": redirect_uris,
                "token_endpoint_auth_method": token_endpoint_auth_method,
            }
        )
        .execute()
    )
    return resp.data[0]


def get_client(client_id: str) -> Optional[dict[str, Any]]:
    resp = (
        supabase()
        .table("oauth_clients")
        .select("*")
        .eq("client_id", client_id)
        .limit(1)
        .execute()
    )
    return resp.data[0] if resp.data else None


# ─────────────────────── Auth codes ───────────────────────

def create_auth_code(
    *,
    client_id: str,
    redirect_uri: str,
    code_challenge: str,
    code_challenge_method: str,
    scope: Optional[str],
) -> str:
    code = _gen(32)
    expires_at = (_now() + timedelta(seconds=AUTH_CODE_TTL_SEC)).isoformat()
    supabase().table("oauth_auth_codes").insert(
        {
            "code": code,
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "code_challenge": code_challenge,
            "code_challenge_method": code_challenge_method,
            "scope": scope,
            "expires_at": expires_at,
        }
    ).execute()
    return code


def consume_auth_code(
    code: str, client_id: str, redirect_uri: str, code_verifier: str
) -> Optional[dict[str, Any]]:
    """Validate + mark used in one go. Returns the row on success, else None."""
    resp = (
        supabase()
        .table("oauth_auth_codes")
        .select("*")
        .eq("code", code)
        .limit(1)
        .execute()
    )
    row = resp.data[0] if resp.data else None
    if not row or row["used"]:
        return None
    if row["client_id"] != client_id or row["redirect_uri"] != redirect_uri:
        return None
    if _parse_ts(row["expires_at"]) < _now():
        return None

    method = row["code_challenge_method"]
    challenge = row["code_challenge"]
    if method == "S256":
        digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
        computed = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
        if computed != challenge:
            return None
    elif method == "plain":
        if code_verifier != challenge:
            return None
    else:
        return None

    supabase().table("oauth_auth_codes").update({"used": True}).eq("code", code).execute()
    return row


# ─────────────────────── Access tokens ───────────────────────

def create_access_token(client_id: str, scope: Optional[str]) -> tuple[str, int]:
    token = _gen(48)
    expires_at = (_now() + timedelta(seconds=ACCESS_TOKEN_TTL_SEC)).isoformat()
    supabase().table("oauth_tokens").insert(
        {
            "token": token,
            "client_id": client_id,
            "scope": scope,
            "expires_at": expires_at,
        }
    ).execute()
    return token, ACCESS_TOKEN_TTL_SEC


def verify_access_token(token: str) -> Optional[dict[str, Any]]:
    resp = (
        supabase()
        .table("oauth_tokens")
        .select("*")
        .eq("token", token)
        .limit(1)
        .execute()
    )
    row = resp.data[0] if resp.data else None
    if not row or row["revoked"]:
        return None
    if row.get("expires_at"):
        if _parse_ts(row["expires_at"]) < _now():
            return None
    return row
