"""Hardening for RFC 7591 Dynamic Client Registration (`/oauth/register`).

Open DCR is intentional — the MCP authorization spec requires it so
Claude.ai (and any MCP client) can self-register. These tests pin the
guard-rails that make open DCR safe:

  - redirect_uri validation at registration (https-only, no fragments,
    no wildcards, loopback-http exempt for local dev)
  - metadata size limits (client_name, redirect_uris count)
  - per-IP rate limiting on registration
  - consent screen shows where the auth code will be sent and warns that
    the client is unverified
  - stale, never-used clients are pruned
"""
from __future__ import annotations

import base64
import hashlib
import secrets

import pytest
import pytest_asyncio
from argon2 import PasswordHasher
from httpx import ASGITransport, AsyncClient

import app.db as db_module
from app.config import get_settings


_TEST_PASSWORD = "test-password-dcr"
_TEST_PASSWORD_HASH = PasswordHasher().hash(_TEST_PASSWORD)
_OPERATOR_EMAIL = "operator@local"


@pytest_asyncio.fixture
async def https_client(db_conn, monkeypatch):
    async with db_conn.connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "UPDATE users SET password_hash = %s WHERE email = %s",
            (_TEST_PASSWORD_HASH, _OPERATOR_EMAIL),
        )
    get_settings.cache_clear()
    monkeypatch.setattr(db_module, "_pool", db_conn)

    from app.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://test") as ac:
        yield ac
    get_settings.cache_clear()


def _pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(48)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge


async def _register(client: AsyncClient, uris: list, name: str = "Test Client"):
    return await client.post(
        "/oauth/register", json={"client_name": name, "redirect_uris": uris}
    )


# ─────────────────────── redirect_uri validation ───────────────────────

@pytest.mark.parametrize(
    "uri",
    [
        "https://example.test/cb",
        "https://example.test:8443/oauth/callback",
        "http://localhost:3000/cb",
        "http://localhost/cb",
        "http://127.0.0.1:8080/cb",
        "http://[::1]:8080/cb",
    ],
)
async def test_register_accepts_valid_redirect_uris(https_client, uri):
    resp = await _register(https_client, [uri])
    assert resp.status_code == 201, resp.text
    assert resp.json()["redirect_uris"] == [uri]


@pytest.mark.parametrize(
    "uri",
    [
        "http://example.test/cb",             # plain http on a real host
        "https://example.test/cb#frag",       # fragment
        "https://*.example.test/cb",          # wildcard host
        "https://example.test/*",             # wildcard path
        "javascript:alert(1)",                # scheme injection
        "data:text/html,hi",
        "file:///etc/passwd",
        "example.test/cb",                    # relative / no scheme
        "https:///cb",                        # no host
        "https://",                           # empty
        "",
        "   ",
    ],
)
async def test_register_rejects_bad_redirect_uris(https_client, uri):
    resp = await _register(https_client, [uri])
    assert resp.status_code == 400, resp.text
    assert resp.json()["error"] == "invalid_redirect_uri"


async def test_register_rejects_non_string_redirect_uri(https_client):
    resp = await _register(https_client, [123])
    assert resp.status_code == 400
    assert resp.json()["error"] == "invalid_redirect_uri"


async def test_register_rejects_one_bad_uri_among_good(https_client):
    """A single bad URI poisons the whole registration — no partial accept."""
    resp = await _register(
        https_client, ["https://good.test/cb", "http://evil.test/cb"]
    )
    assert resp.status_code == 400
    assert resp.json()["error"] == "invalid_redirect_uri"


async def test_register_error_body_is_rfc7591_shaped(https_client):
    resp = await _register(https_client, ["http://evil.test/cb"])
    body = resp.json()
    assert set(body) >= {"error", "error_description"}


# ─────────────────────── metadata limits ───────────────────────

async def test_register_rejects_too_many_redirect_uris(https_client):
    uris = [f"https://example.test/cb{i}" for i in range(11)]
    resp = await _register(https_client, uris)
    assert resp.status_code == 400
    assert resp.json()["error"] == "invalid_client_metadata"


async def test_register_rejects_overlong_client_name(https_client):
    resp = await _register(https_client, ["https://example.test/cb"], name="x" * 101)
    assert resp.status_code == 400
    assert resp.json()["error"] == "invalid_client_metadata"


async def test_register_rejects_non_string_client_name(https_client):
    resp = await https_client.post(
        "/oauth/register",
        json={"client_name": {"$ne": 1}, "redirect_uris": ["https://example.test/cb"]},
    )
    assert resp.status_code == 400
    assert resp.json()["error"] == "invalid_client_metadata"


async def test_register_strips_control_chars_from_client_name(https_client):
    resp = await _register(
        https_client, ["https://example.test/cb"], name="Evil\nApp\x00"
    )
    assert resp.status_code == 201
    assert resp.json()["client_name"] == "EvilApp"


# ─────────────────────── rate limiting ───────────────────────

async def test_register_is_rate_limited_per_ip(https_client, monkeypatch):
    monkeypatch.setenv("REGISTER_MAX", "3")
    monkeypatch.setenv("REGISTER_WINDOW_MIN", "60")
    get_settings.cache_clear()

    for i in range(3):
        resp = await _register(https_client, [f"https://example.test/cb{i}"])
        assert resp.status_code == 201, f"registration {i} should succeed"

    resp = await _register(https_client, ["https://example.test/cb-overflow"])
    assert resp.status_code == 429


async def test_register_rate_limit_counts_rejected_attempts_too(https_client, monkeypatch):
    """Invalid registrations still burn budget — otherwise an attacker probes
    the validator for free."""
    monkeypatch.setenv("REGISTER_MAX", "2")
    get_settings.cache_clear()

    for _ in range(2):
        resp = await _register(https_client, ["http://evil.test/cb"])
        assert resp.status_code == 400

    resp = await _register(https_client, ["https://good.test/cb"])
    assert resp.status_code == 429


# ─────────────────────── consent screen ───────────────────────

async def _register_and_login(client: AsyncClient, uri: str, name: str) -> str:
    reg = await _register(client, [uri], name=name)
    assert reg.status_code == 201, reg.text
    login = await client.post(
        "/api/auth/login", json={"email": _OPERATOR_EMAIL, "password": _TEST_PASSWORD}
    )
    assert login.status_code == 200
    return reg.json()["client_id"]


async def test_consent_page_shows_redirect_destination_and_unverified_warning(https_client):
    uri = "https://attacker-controlled.test/cb"
    client_id = await _register_and_login(https_client, uri, "OpenStudy Official")
    _, challenge = _pkce_pair()

    resp = await https_client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": uri,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
    )
    assert resp.status_code == 200
    page = resp.text
    # The user must be able to see where the auth code is going.
    assert "attacker-controlled.test" in page
    # And be told the client name is self-asserted, not vetted by us.
    assert "not verified" in page.lower()


async def test_consent_page_escapes_redirect_host(https_client):
    """Host is attacker-supplied; make sure it's HTML-escaped when shown."""
    uri = "https://x.test/cb?q=<b>bold</b>"
    client_id = await _register_and_login(https_client, uri, "Escaper")
    _, challenge = _pkce_pair()
    resp = await https_client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": uri,
            "code_challenge": challenge,
        },
    )
    assert resp.status_code == 200
    assert "<b>bold</b>" not in resp.text
    assert "&lt;b&gt;bold&lt;/b&gt;" in resp.text


# ─────────────────────── stale client pruning ───────────────────────

async def test_stale_unused_clients_are_pruned_on_register(https_client, db_conn):
    # A client registered 8 days ago that never completed an auth flow.
    async with db_conn.connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO oauth_clients (client_id, client_name, redirect_uris, created_at) "
            "VALUES ('stale-1', 'Stale', ARRAY['https://s.test/cb'], now() - interval '8 days')"
        )
        # A client of the same age that DID get a token — must survive.
        await cur.execute(
            "INSERT INTO oauth_clients (client_id, client_name, redirect_uris, created_at) "
            "VALUES ('used-1', 'Used', ARRAY['https://u.test/cb'], now() - interval '8 days')"
        )
        await cur.execute(
            "INSERT INTO oauth_tokens (user_id, token, client_id, expires_at) "
            "SELECT id, 'tok-used-1', 'used-1', now() + interval '1 day' "
            "FROM users WHERE email = %s",
            (_OPERATOR_EMAIL,),
        )
        # A fresh unused client — must survive (still inside the grace window).
        await cur.execute(
            "INSERT INTO oauth_clients (client_id, client_name, redirect_uris, created_at) "
            "VALUES ('fresh-1', 'Fresh', ARRAY['https://f.test/cb'], now() - interval '1 hour')"
        )

    resp = await _register(https_client, ["https://trigger.test/cb"])
    assert resp.status_code == 201

    async with db_conn.connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "SELECT client_id FROM oauth_clients WHERE client_id IN ('stale-1','used-1','fresh-1') "
            "ORDER BY client_id"
        )
        rows = [r["client_id"] if isinstance(r, dict) else r[0] for r in await cur.fetchall()]
    assert rows == ["fresh-1", "used-1"]


# ─────────────────────── token TTL ───────────────────────

async def test_access_token_ttl_is_configurable(https_client, monkeypatch):
    monkeypatch.setenv("OAUTH_TOKEN_TTL_DAYS", "7")
    get_settings.cache_clear()

    uri = "https://ttl.test/cb"
    client_id = await _register_and_login(https_client, uri, "TTL Client")
    verifier, challenge = _pkce_pair()
    state = "abc"

    auth = await https_client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": uri,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "state": state,
        },
    )
    assert auth.status_code == 200

    consent = await https_client.post(
        "/oauth/consent",
        data={
            "client_id": client_id,
            "redirect_uri": uri,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "state": state,
        },
        follow_redirects=False,
    )
    assert consent.status_code == 302
    location = consent.headers["location"]
    code = location.split("code=")[1].split("&")[0]

    tok = await https_client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": uri,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    )
    assert tok.status_code == 200, tok.text
    assert tok.json()["expires_in"] == 7 * 24 * 60 * 60
