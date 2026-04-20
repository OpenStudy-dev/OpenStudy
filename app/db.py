"""Thin Postgres client via PostgREST (Supabase's data-plane HTTP interface).

We use `postgrest-py` directly instead of the full `supabase` package because
the latter pulls in storage/auth/functions/pyiceberg etc. and blows past
Vercel's 250MB serverless function limit.
"""
from functools import lru_cache
from postgrest import SyncPostgrestClient
from .config import get_settings


@lru_cache
def supabase() -> "_Client":
    s = get_settings()
    if not s.supabase_url or not s.supabase_service_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set. "
            "Copy .env.example to .env and fill them in."
        )
    rest_url = s.supabase_url.rstrip("/") + "/rest/v1"
    client = SyncPostgrestClient(
        rest_url,
        headers={
            "apikey": s.supabase_service_key,
            "Authorization": f"Bearer {s.supabase_service_key}",
        },
    )
    return _Client(client)


class _Client:
    """Shim that exposes the same `.table(name)` API the existing services use."""

    def __init__(self, pg: SyncPostgrestClient):
        self._pg = pg

    def table(self, name: str):
        return self._pg.from_(name)
