"""OAuth 2.1 authorization server + resource server discovery.

Implements the minimum spec for Claude.ai's custom remote MCP connectors:
  - RFC 9728 `/.well-known/oauth-protected-resource`
  - RFC 8414 `/.well-known/oauth-authorization-server`
  - RFC 7591 Dynamic Client Registration
  - Authorization Code grant with PKCE-S256 (OAuth 2.1 required)

Consent reuses the existing dashboard password session — user logs in once,
approves Claude.ai once, done.
"""
from __future__ import annotations

import html
from typing import Any, Optional
from urllib.parse import quote, urlencode, urlsplit

from fastapi import APIRouter, Body, Cookie, Depends, Form, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from ..auth import COOKIE_NAME, optional_auth, require_user, User
from ..config import get_settings
from ..ratelimit import check_register_rate, record_auth_attempt
from ..services import oauth as oauth_svc

_CONSENT_COOKIE = "oauth_consent_state"
_CONSENT_MAX_AGE = 600  # 10 minutes


def _consent_signer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(get_settings().session_secret, salt="oauth-consent")


router = APIRouter(tags=["oauth"])


def _origin(request: Request) -> str:
    s = get_settings()
    if s.public_url:
        return s.public_url.rstrip("/")
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.url.netloc
    return f"{proto}://{host}"


def _safe_redirect_uri(uri: str) -> str:
    """Reject `javascript:` / `data:` / `vbscript:` redirect URIs. Returns
    the URI unchanged if safe, an empty string if not. Empty string is
    treated as 'no Deny link' downstream.

    OAuth 2.1 already requires `redirect_uri` to be pre-registered, and
    `/oauth/register` now rejects these schemes up front via
    `oauth_svc.redirect_uri_error`. This is defence in depth for rows that
    predate that validation.
    """
    lowered = uri.strip().lower()
    for bad in ("javascript:", "data:", "vbscript:", "file:"):
        if lowered.startswith(bad):
            return ""
    return uri


# ─────────────────────── Discovery metadata ───────────────────────

@router.get("/.well-known/oauth-protected-resource", include_in_schema=False)
@router.get("/.well-known/oauth-protected-resource/mcp", include_in_schema=False)
async def oauth_protected_resource(request: Request) -> JSONResponse:
    """RFC 9728 — tells clients where to find the authorization server."""
    origin = _origin(request)
    return JSONResponse(
        {
            "resource": f"{origin}/mcp",
            "authorization_servers": [origin],
            "bearer_methods_supported": ["header"],
            "scopes_supported": ["mcp"],
        }
    )


@router.get("/.well-known/oauth-authorization-server", include_in_schema=False)
async def oauth_authorization_server(request: Request) -> JSONResponse:
    """RFC 8414 — advertises the AS endpoints."""
    origin = _origin(request)
    return JSONResponse(
        {
            "issuer": origin,
            "authorization_endpoint": f"{origin}/oauth/authorize",
            "token_endpoint": f"{origin}/oauth/token",
            "registration_endpoint": f"{origin}/oauth/register",
            "revocation_endpoint": f"{origin}/oauth/revoke",
            "response_types_supported": ["code"],
            "grant_types_supported": ["authorization_code"],
            "code_challenge_methods_supported": ["S256"],
            "token_endpoint_auth_methods_supported": ["none"],
            "revocation_endpoint_auth_methods_supported": ["none"],
            "scopes_supported": ["mcp"],
        }
    )


# ─────────────────────── Dynamic Client Registration (RFC 7591) ───────────────────────

_MAX_REDIRECT_URIS = 10
_MAX_CLIENT_NAME = 100


def _dcr_error(error: str, description: str) -> JSONResponse:
    """RFC 7591 §3.2.2 error response."""
    return JSONResponse(
        status_code=400, content={"error": error, "error_description": description}
    )


@router.post("/oauth/register", include_in_schema=False)
async def register_client(request: Request, body: dict[str, Any] = Body(...)) -> JSONResponse:
    """Deliberately unauthenticated. The MCP authorization spec requires open
    DCR so clients like Claude.ai can self-register without an operator in
    the loop. What makes that safe is everything around it: a per-IP rate
    limit, strict redirect_uri validation, metadata caps, and a consent
    screen that tells the user exactly where the auth code is going.

    Registered clients are never deleted here: MCP clients cache their
    client_id indefinitely, so removing a row breaks them until the user
    clears the client's stored credentials.
    """
    await check_register_rate(request)

    async def reject(error: str, description: str) -> JSONResponse:
        # Rejected attempts still count toward the rate limit.
        await record_auth_attempt(request, ok=False, kind="register")
        return _dcr_error(error, description)

    name = body.get("client_name")
    if name is None:
        name = "Unnamed client"
    if not isinstance(name, str):
        return await reject("invalid_client_metadata", "client_name must be a string")
    # Strip control characters so the name can't smuggle newlines into logs
    # or the consent page.
    name = "".join(ch for ch in name if ch.isprintable()).strip() or "Unnamed client"
    if len(name) > _MAX_CLIENT_NAME:
        return await reject(
            "invalid_client_metadata", f"client_name too long (max {_MAX_CLIENT_NAME})"
        )

    redirect_uris = body.get("redirect_uris")
    if not isinstance(redirect_uris, list) or not redirect_uris:
        return await reject("invalid_client_metadata", "redirect_uris required")
    if len(redirect_uris) > _MAX_REDIRECT_URIS:
        return await reject(
            "invalid_client_metadata", f"too many redirect_uris (max {_MAX_REDIRECT_URIS})"
        )
    for uri in redirect_uris:
        why = oauth_svc.redirect_uri_error(uri)
        if why:
            shown = str(uri)[:200]
            return await reject("invalid_redirect_uri", f"{shown!r}: {why}")

    client = await oauth_svc.create_client(
        client_name=name,
        redirect_uris=redirect_uris,
        token_endpoint_auth_method="none",
        public=True,
    )
    await record_auth_attempt(request, ok=True, kind="register")
    return JSONResponse(
        status_code=201,
        content={
            "client_id": client["client_id"],
            "client_name": client["client_name"],
            "redirect_uris": client["redirect_uris"],
            "token_endpoint_auth_method": "none",
            "grant_types": ["authorization_code"],
            "response_types": ["code"],
        },
    )


# ─────────────────────── Authorization + consent ───────────────────────

@router.get("/oauth/authorize", include_in_schema=False)
async def authorize(
    request: Request,
    response_type: str = Query(...),
    client_id: str = Query(...),
    redirect_uri: str = Query(...),
    code_challenge: str = Query(...),
    code_challenge_method: str = Query("S256"),
    scope: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    study_session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
) -> Response:
    if response_type != "code":
        raise HTTPException(400, "unsupported response_type")
    if code_challenge_method != "S256":
        raise HTTPException(400, "unsupported code_challenge_method (S256 only)")

    client = await oauth_svc.get_client(client_id)
    if not client:
        raise HTTPException(400, "unknown client_id")
    if not oauth_svc.redirect_uri_matches(redirect_uri, client["redirect_uris"]):
        raise HTTPException(400, "redirect_uri not registered for client")

    authed = await optional_auth(study_session)
    if not authed:
        params = {
            "response_type": response_type,
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "code_challenge": code_challenge,
            "code_challenge_method": code_challenge_method,
        }
        if scope:
            params["scope"] = scope
        if state:
            params["state"] = state
        back = f"/oauth/authorize?{urlencode(params)}"
        return RedirectResponse(f"/login?next={quote(back, safe='')}")

    # Escape every interpolated value. quote=True covers " and ' so an
    # attacker can't break out of an attribute value. _safe_redirect_uri
    # additionally rejects scheme injection on the Deny link.
    safe_name = html.escape(client["client_name"] or "a client", quote=True)
    safe_client_id = html.escape(client_id, quote=True)
    safe_redirect = _safe_redirect_uri(redirect_uri)
    safe_redirect_attr = html.escape(safe_redirect, quote=True)
    # Shown to the user so a phished consent is at least an informed one:
    # client_name is self-asserted by whoever registered the client, so the
    # only trustworthy signal is where the auth code will actually be sent.
    safe_redirect_host = html.escape(urlsplit(redirect_uri).hostname or redirect_uri, quote=True)
    safe_redirect_full = html.escape(redirect_uri, quote=True)
    safe_challenge = html.escape(code_challenge, quote=True)
    safe_method = html.escape(code_challenge_method or "S256", quote=True)
    safe_scope = html.escape(scope or "", quote=True)
    safe_state = html.escape(state or "", quote=True)
    # Deny link goes back to redirect_uri ONLY if it's a safe scheme;
    # otherwise we strip the link to avoid producing a clickable
    # javascript:/data: URI in the rendered page.
    deny_href = (
        f"{safe_redirect}?error=access_denied&state={state or ''}"
        if safe_redirect
        else "#"
    )
    deny_href_attr = html.escape(deny_href, quote=True)

    page = f"""<!doctype html>
<html lang="en" class="dark"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize {safe_name}</title>
  <style>
    html, body {{ margin: 0; padding: 0; background: #0f0f11; color: #fafafa; font-family: -apple-system, system-ui, "Segoe UI", sans-serif; }}
    body {{ min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.25rem; }}
    .card {{ background: #181a1c; border: 1px solid #2a2d31; border-radius: 14px; padding: 1.75rem 1.75rem 1.5rem; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }}
    h1 {{ margin: 0 0 0.25rem; font-size: 1.25rem; font-weight: 600; letter-spacing: -0.01em; }}
    p {{ color: #a8acb3; font-size: 0.9rem; line-height: 1.5; margin: 0.75rem 0 0; }}
    .name {{ color: #fafafa; font-weight: 600; }}
    ul {{ color: #a8acb3; font-size: 0.85rem; padding-left: 1.2rem; margin: 0.75rem 0 0; line-height: 1.6; }}
    .notice {{ margin-top: 1.25rem; padding: 0.85rem 1rem; border-radius: 10px; background: #26200f; border: 1px solid #5a4a1a; color: #e8d9a8; font-size: 0.85rem; line-height: 1.5; }}
    .notice strong {{ color: #f5e6b8; }}
    .notice code {{ display: block; margin: 0.4rem 0; padding: 0.4rem 0.55rem; border-radius: 6px; background: #1a1a1c; color: #fafafa; font-size: 0.8rem; word-break: break-all; }}
    .notice .host {{ font-weight: 600; color: #fafafa; }}
    .actions {{ display: flex; gap: 0.5rem; margin-top: 1.75rem; }}
    button, a.btn {{ flex: 1; padding: 0.7rem 1rem; border-radius: 8px; border: 1px solid #2a2d31; font-size: 0.9rem; font-weight: 500; cursor: pointer; text-align: center; text-decoration: none; color: #fafafa; background: transparent; font-family: inherit; }}
    button.primary {{ background: #fafafa; color: #0f0f11; border-color: #fafafa; }}
    button.primary:hover {{ background: #e5e5e5; }}
    a.btn.ghost {{ color: #a8acb3; }}
    a.btn.ghost:hover {{ color: #fafafa; background: #232629; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize access</h1>
    <p><span class="name">{safe_name}</span> is asking to access your OpenStudy session on your behalf.</p>
    <p>Approving will allow it to:</p>
    <ul>
      <li>Read your courses, tasks, deliverables, lectures, and study topics</li>
      <li>Create, update, and delete those same resources</li>
      <li>Record activity events</li>
    </ul>
    <div class="notice">
      <strong>{safe_name}</strong> is not verified by OpenStudy — the name is chosen by the app itself.
      If you approve, an access code will be sent to <span class="host">{safe_redirect_host}</span>:
      <code>{safe_redirect_full}</code>
      Only approve if you started this connection yourself (for example from Claude.ai's connector settings).
      If you arrived here from a link someone sent you, deny.
    </div>
    <form method="post" action="/oauth/consent" class="actions">
      <input type="hidden" name="client_id" value="{safe_client_id}">
      <input type="hidden" name="redirect_uri" value="{safe_redirect_attr}">
      <input type="hidden" name="code_challenge" value="{safe_challenge}">
      <input type="hidden" name="code_challenge_method" value="{safe_method}">
      <input type="hidden" name="scope" value="{safe_scope}">
      <input type="hidden" name="state" value="{safe_state}">
      <a class="btn ghost" href="{deny_href_attr}">Deny</a>
      <button type="submit" class="primary">Approve</button>
    </form>
  </div>
</body></html>"""
    # Bind this authorize request to the subsequent consent POST via a
    # short-lived signed cookie. This prevents a CSRF attacker from swapping
    # `state` (or any other parameter) via a crafted consent form submission.
    consent_payload = {
        "state": state or "",
        "client_id": client_id,
        "challenge": code_challenge,
    }
    consent_token = _consent_signer().dumps(consent_payload)
    resp = HTMLResponse(content=page)
    resp.set_cookie(
        key=_CONSENT_COOKIE,
        value=consent_token,
        max_age=_CONSENT_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/oauth/",
    )
    return resp


@router.post("/oauth/consent", include_in_schema=False)
async def consent(
    request: Request,
    client_id: str = Form(...),
    redirect_uri: str = Form(...),
    code_challenge: str = Form(...),
    code_challenge_method: str = Form("S256"),
    scope: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    oauth_consent_state: Optional[str] = Cookie(default=None, alias=_CONSENT_COOKIE),
    user: User = Depends(require_user),
) -> Response:
    # Verify the signed consent cookie to bind this POST to the originating
    # /authorize request. Rejects forged / tampered / expired consent forms.
    if not oauth_consent_state:
        raise HTTPException(400, "consent state invalid")
    try:
        cookie_data = _consent_signer().loads(oauth_consent_state, max_age=_CONSENT_MAX_AGE)
    except (BadSignature, SignatureExpired):
        raise HTTPException(400, "consent state invalid")

    if (
        cookie_data.get("state") != (state or "")
        or cookie_data.get("client_id") != client_id
        or cookie_data.get("challenge") != code_challenge
    ):
        raise HTTPException(400, "consent state invalid")

    client = await oauth_svc.get_client(client_id)
    if not client or not oauth_svc.redirect_uri_matches(redirect_uri, client["redirect_uris"]):
        raise HTTPException(400, "invalid client/redirect")

    code = await oauth_svc.create_auth_code(
        user_id=user.id,
        client_id=client_id,
        redirect_uri=redirect_uri,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
        scope=scope or None,
    )
    params: dict[str, str] = {"code": code}
    if state:
        params["state"] = state
    resp = RedirectResponse(f"{redirect_uri}?{urlencode(params)}", status_code=302)
    resp.delete_cookie(_CONSENT_COOKIE, path="/oauth/")
    return resp


# ─────────────────────── Token revocation (RFC 7009) ───────────────────────

@router.post("/oauth/revoke", include_in_schema=False)
async def revoke(
    token: str = Form(...),
    token_type_hint: Optional[str] = Form(None),
    client_id: Optional[str] = Form(None),
) -> Response:
    """RFC 7009 token revocation. Public clients (auth_method=none) call this
    on logout. Per spec, the response is always 200 even when the token is
    unknown — surfacing a distinction would let callers enumerate live tokens."""
    await oauth_svc.revoke_token(token)
    return Response(status_code=200)


# ─────────────────────── Token endpoint ───────────────────────

@router.post("/oauth/token", include_in_schema=False)
async def token(
    grant_type: str = Form(...),
    code: str = Form(...),
    redirect_uri: str = Form(...),
    client_id: str = Form(...),
    code_verifier: str = Form(...),
) -> JSONResponse:
    if grant_type != "authorization_code":
        raise HTTPException(400, "unsupported_grant_type")
    row = await oauth_svc.consume_auth_code(code, client_id, redirect_uri, code_verifier)
    if not row:
        raise HTTPException(400, "invalid_grant")
    access_token, expires_in = await oauth_svc.create_access_token(row["user_id"], client_id, row.get("scope"))
    return JSONResponse(
        {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": expires_in,
            "scope": row.get("scope") or "mcp",
        }
    )
