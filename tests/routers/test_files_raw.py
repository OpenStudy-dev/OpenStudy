"""GET /api/files/raw — Content-Disposition decides view vs download.

The file viewer loads PDFs in an iframe (and "open in new tab" navigates to
the same URL). With `attachment` the browser downloads instead of showing
the file, so types the browser renders safely must be `inline`. Anything
that could run script on our origin (HTML, SVG, …) must stay `attachment`,
and `nosniff` stops the browser reinterpreting a file as HTML.
"""
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.auth import SENTINEL_USER_ID


@pytest_asyncio.fixture
async def raw_client(db_conn, tmp_path, monkeypatch):
    import app.db as db_module
    from app.auth import _sentinel_user, require_user
    from app.config import get_settings
    from app.main import create_app

    monkeypatch.setenv("STUDY_ROOT", str(tmp_path))
    get_settings.cache_clear()
    user_dir: Path = tmp_path / str(SENTINEL_USER_ID)
    (user_dir / "AML").mkdir(parents=True)
    files = {
        "AML/Vorlesung 01 Übung.pdf": b"%PDF-1.4\n%%EOF\n",
        "AML/diagram.png": b"\x89PNG\r\n\x1a\n",
        "AML/photo.jpg": b"\xff\xd8\xff",
        "AML/page.html": b"<script>alert(1)</script>",
        "AML/icon.svg": b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
        "AML/notes.zip": b"PK\x03\x04",
    }
    for rel, body in files.items():
        (user_dir / rel).write_bytes(body)

    monkeypatch.setattr(db_module, "_pool", db_conn)
    app = create_app()
    app.dependency_overrides[require_user] = lambda: _sentinel_user()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    get_settings.cache_clear()


async def _get(client: AsyncClient, rel: str):
    resp = await client.get("/api/files/raw", params={"path": rel})
    assert resp.status_code == 200, resp.text
    return resp


@pytest.mark.parametrize(
    "rel, ctype",
    [
        ("AML/Vorlesung 01 Übung.pdf", "application/pdf"),
        ("AML/diagram.png", "image/png"),
        ("AML/photo.jpg", "image/jpeg"),
    ],
)
async def test_viewable_types_are_served_inline(raw_client, rel, ctype):
    resp = await _get(raw_client, rel)
    assert resp.headers["content-type"].startswith(ctype)
    assert resp.headers["content-disposition"].startswith("inline")


async def test_inline_keeps_non_ascii_filename(raw_client):
    resp = await _get(raw_client, "AML/Vorlesung 01 Übung.pdf")
    # RFC 5987 encoding so "Save as…" from the viewer keeps the real name.
    assert "Vorlesung%2001%20%C3%9Cbung.pdf" in resp.headers["content-disposition"]


@pytest.mark.parametrize("rel", ["AML/page.html", "AML/icon.svg", "AML/notes.zip"])
async def test_other_types_stay_attachment(raw_client, rel):
    resp = await _get(raw_client, rel)
    assert resp.headers["content-disposition"].startswith("attachment")


@pytest.mark.parametrize("rel", ["AML/Vorlesung 01 Übung.pdf", "AML/page.html"])
async def test_nosniff_on_every_file(raw_client, rel):
    resp = await _get(raw_client, rel)
    assert resp.headers["x-content-type-options"] == "nosniff"
