"""Course files browser API — backed by the Supabase `course_files` bucket.

Two endpoints, both session-auth-gated:
  GET /files/list?prefix=…     → list entries (folders + files) at that prefix
  GET /files/signed-url?path=… → short-lived URL for direct-from-Supabase download
"""
from __future__ import annotations

import unicodedata
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from ..auth import require_auth
from ..services import storage as storage_svc


_UMLAUT_MAP = str.maketrans({
    "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
    "Ä": "Ae", "Ö": "Oe", "Ü": "Ue",
})


def _sanitize_path(p: str) -> str:
    """Match scripts/sync_semester_to_bucket.py's sanitisation so uploads from
    the app land at the same key a local sync would produce."""
    s = p.translate(_UMLAUT_MAP)
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ascii", "ignore").decode("ascii")
    # collapse consecutive slashes, strip leading slash
    parts = [seg for seg in s.split("/") if seg]
    return "/".join(parts)


router = APIRouter(prefix="/files", tags=["files"], dependencies=[Depends(require_auth)])


@router.get("/list")
async def list_files(prefix: str = Query(default=""), limit: int = Query(default=500, le=1000)) -> list[dict[str, Any]]:
    """List entries at the given prefix. Not recursive — drill down by passing
    a folder's path as the next prefix. Returns a sorted list of
    {name, path, type, size?, content_type?, updated_at?}."""
    clean = (prefix or "").strip().strip("/")
    entries = storage_svc.list_files(prefix=clean, limit=limit)
    out: list[dict[str, Any]] = []
    for e in entries:
        name = e.get("name") or ""
        if not name:
            continue
        path = f"{clean}/{name}" if clean else name
        if e.get("id") is None:
            out.append({"name": name, "path": path, "type": "folder"})
        else:
            meta = e.get("metadata") or {}
            out.append(
                {
                    "name": name,
                    "path": path,
                    "type": "file",
                    "size": meta.get("size"),
                    "content_type": meta.get("mimetype"),
                    "updated_at": e.get("updated_at"),
                }
            )
    # Folders first, then files — each alphabetised
    out.sort(key=lambda e: (0 if e["type"] == "folder" else 1, e["name"].lower()))
    return out


@router.get("/signed-url")
async def signed_url(path: str = Query(...), expires_in: int = Query(default=3600, ge=60, le=86400)) -> dict[str, Any]:
    """Mint a signed URL for the given object path. Default 1-hour expiry so
    the browser can cache the PDF response for reasonable repeat views."""
    if not path or ".." in path:
        raise HTTPException(400, "invalid path")
    try:
        url = storage_svc.signed_url(path, expires_in=expires_in)
    except Exception as exc:
        raise HTTPException(404, f"not found: {exc}") from exc
    return {"url": url, "expires_in": expires_in}


@router.post("/upload-url")
async def upload_url(body: dict[str, Any] = Body(...)) -> dict[str, Any]:
    """Mint a single-use upload URL for the browser to PUT the file directly
    to Supabase (bypasses Vercel's function body limit for large uploads).

    Body: {path: string}. Path is sanitised server-side so it ends up keyed
    the same way our local-sync script would key it.
    """
    raw = (body.get("path") or "").strip().strip("/")
    if not raw or ".." in raw:
        raise HTTPException(400, "invalid path")
    key = _sanitize_path(raw)
    if not key:
        raise HTTPException(400, "path empty after sanitisation")
    try:
        result = storage_svc.signed_upload_url(key)
    except Exception as exc:
        raise HTTPException(500, f"failed to sign upload: {exc}") from exc
    return result
