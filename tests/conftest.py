"""Shared pytest fixtures.

- `pg_url`: a throwaway Postgres testcontainer with the baseline schema
  applied. Session-scoped — one container per test run.
- `db_pool`: an async psycopg pool against `pg_url`. Function-scoped —
  swapped onto `app.db._pool` so service code under test reaches our pool.
- `client`: a FastAPI httpx test client wired to use the test pool.
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
import pytest_asyncio
from testcontainers.postgres import PostgresContainer

# psycopg's async pool can't run on Windows' default ProactorEventLoop —
# it needs the selector loop. Set the policy at module load so every async
# test (and the session fixture) uses the right loop kind.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

REPO_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def event_loop():
    # pytest-asyncio default is function-scoped; we need session-scoped
    # so the testcontainer's lifecycle survives across tests.
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def pg_url() -> str:
    """Spin up a Postgres testcontainer, apply the baseline schema, return DSN."""
    with PostgresContainer(
        "postgres:16-alpine",
        username="openstudy",
        password="testpw",
        dbname="openstudy_test",
    ) as pg:
        # testcontainers gives us a SQLAlchemy-style URL; psycopg wants the
        # plain `postgresql://` form.
        dsn = pg.get_connection_url().replace(
            "postgresql+psycopg2://", "postgresql://"
        )
        # Apply the baseline migration via run_migrations.py
        env = {
            **os.environ,
            "POSTGRES_USER": "openstudy",
            "POSTGRES_PASSWORD": "testpw",
            "POSTGRES_DB": "openstudy_test",
            "PGHOST": pg.get_container_host_ip(),
            "PGPORT": str(pg.get_exposed_port(5432)),
        }
        result = subprocess.run(
            [sys.executable, str(REPO_ROOT / "scripts" / "run_migrations.py")],
            env=env,
            capture_output=True,
            text=True,
            cwd=str(REPO_ROOT),
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"Migration failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
            )
        yield dsn


@pytest_asyncio.fixture
async def db_pool(pg_url: str) -> AsyncIterator:
    """An async psycopg pool against the testcontainer."""
    from psycopg.rows import dict_row
    from psycopg_pool import AsyncConnectionPool

    pool = AsyncConnectionPool(
        pg_url,
        min_size=1,
        max_size=2,
        open=False,
        kwargs={"row_factory": dict_row},
    )
    await pool.open()
    try:
        yield pool
    finally:
        await pool.close()


@pytest_asyncio.fixture
async def client(db_pool, monkeypatch):
    """FastAPI app + httpx AsyncClient. Patches `app.db._pool` to use our test pool."""
    from httpx import ASGITransport, AsyncClient

    import app.db as db_module

    # Replace the module-level pool with our test pool. The service code
    # under test reaches `_pool` via `db.pool()` / `db.fetch()` / etc.
    monkeypatch.setattr(db_module, "_pool", db_pool)

    from app.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
