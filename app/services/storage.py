"""Thin Supabase Storage client (REST API).

We don't use the `supabase` package because it blows past Vercel's serverless
limit. The Storage REST API is small and stable — a handful of httpx calls.

Every operation emits an event so the Activity page shows everything that
touches the bucket (MCP tool calls, web uploads, signed-URL mints, syncs).
"""
from __future__ import annotations

from typing import Any, Optional

import httpx

from ..config import get_settings


BUCKET = "course_files"


def _log(kind: str, payload: dict[str, Any]) -> None:
    """Best-effort event log. Import `db` lazily to avoid circular imports
    (db/postgrest doesn't depend on this module, but the storage module is
    called from many places and we don't want a DB blip to break uploads)."""
    try:
        from ..db import supabase

        supabase().table("events").insert(
            {"kind": kind, "payload": payload}
        ).execute()
    except Exception:
        pass


def _base_url() -> str:
    return get_settings().supabase_url.rstrip("/") + "/storage/v1"


def _headers() -> dict[str, str]:
    key = get_settings().supabase_service_key
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }


def list_files(prefix: str = "", *, limit: int = 200) -> list[dict[str, Any]]:
    """List objects under an optional path prefix. Returns Supabase's raw
    metadata shape: {name, id, updated_at, created_at, last_accessed_at,
    metadata: {size, mimetype, ...}}."""
    resp = httpx.post(
        f"{_base_url()}/object/list/{BUCKET}",
        headers={**_headers(), "Content-Type": "application/json"},
        json={
            "prefix": prefix,
            "limit": limit,
            "offset": 0,
            "sortBy": {"column": "name", "order": "asc"},
        },
        timeout=15.0,
    )
    resp.raise_for_status()
    data = resp.json()
    _log("storage:list", {"prefix": prefix, "count": len(data)})
    return data


def download(path: str) -> bytes:
    """Download a file's raw bytes."""
    resp = httpx.get(
        f"{_base_url()}/object/{BUCKET}/{path}",
        headers=_headers(),
        timeout=30.0,
    )
    resp.raise_for_status()
    _log("storage:read", {"path": path, "size": len(resp.content)})
    return resp.content


def upload(path: str, data: bytes, content_type: str = "application/octet-stream") -> dict[str, Any]:
    """Upload (or replace) a file at `path`."""
    resp = httpx.post(
        f"{_base_url()}/object/{BUCKET}/{path}",
        headers={**_headers(), "Content-Type": content_type, "x-upsert": "true"},
        content=data,
        timeout=60.0,
    )
    resp.raise_for_status()
    _log(
        "storage:upload",
        {"path": path, "size": len(data), "content_type": content_type},
    )
    return resp.json()


def delete(paths: list[str]) -> dict[str, Any]:
    """Delete one or more files."""
    resp = httpx.request(
        "DELETE",
        f"{_base_url()}/object/{BUCKET}",
        headers={**_headers(), "Content-Type": "application/json"},
        json={"prefixes": paths},
        timeout=15.0,
    )
    resp.raise_for_status()
    _log("storage:delete", {"paths": paths, "count": len(paths)})
    return resp.json()


def exists(path: str) -> bool:
    resp = httpx.head(
        f"{_base_url()}/object/{BUCKET}/{path}",
        headers=_headers(),
        timeout=15.0,
    )
    return resp.status_code == 200


def signed_url(path: str, expires_in: int = 3600) -> str:
    resp = httpx.post(
        f"{_base_url()}/object/sign/{BUCKET}/{path}",
        headers={**_headers(), "Content-Type": "application/json"},
        json={"expiresIn": expires_in},
        timeout=15.0,
    )
    resp.raise_for_status()
    token = resp.json()["signedURL"]
    # signedURL starts with /object/sign/...
    full = f"{_base_url()}{token}"
    _log("storage:sign", {"path": path, "expires_in": expires_in})
    return full


def signed_upload_url(path: str) -> dict[str, Any]:
    """Mint a single-use URL the browser can PUT a file to directly.
    Returns {url, token, path}."""
    resp = httpx.post(
        f"{_base_url()}/object/upload/sign/{BUCKET}/{path}",
        headers=_headers(),
        timeout=15.0,
    )
    resp.raise_for_status()
    data = resp.json()
    rel = data.get("url", "")
    full = f"{_base_url()}{rel}" if rel.startswith("/") else rel
    _log("storage:sign:upload", {"path": path})
    return {"url": full, "token": data.get("token"), "path": path}
