"""Simple DB-backed rate limiter for /login.

We record each attempt (ip, at, ok). If too many failed attempts from a single IP
within the window, reject with 429.
"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status

from .config import get_settings
from .db import supabase


def client_ip(request: Request) -> str:
    # Vercel sets x-forwarded-for; fall back to request.client.host
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def check_login_rate(request: Request) -> None:
    s = get_settings()
    ip = client_ip(request)
    since = (datetime.now(timezone.utc) - timedelta(minutes=s.login_attempts_window_min)).isoformat()

    resp = (
        supabase()
        .table("login_attempts")
        .select("id", count="exact")
        .eq("ip", ip)
        .eq("ok", False)
        .gte("at", since)
        .execute()
    )
    failures = resp.count or 0
    if failures >= s.login_attempts_max:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"too many login attempts; try again in {s.login_attempts_window_min} min",
        )


async def record_login_attempt(request: Request, ok: bool) -> None:
    ip = client_ip(request)
    ua = request.headers.get("user-agent", "")[:200]
    supabase().table("login_attempts").insert(
        {"ip": ip, "ok": ok, "user_agent": ua}
    ).execute()
