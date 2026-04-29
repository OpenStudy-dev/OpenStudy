"""Shared pytest fixtures.

Architecture (rewritten in Batch C2):

- `pg_url` (session)        — one Postgres testcontainer per run, baseline
                              schema applied via run_migrations.py.
- `_real_pool` (session)    — single AsyncConnectionPool against `pg_url`,
                              configured identically to `app.db.init_pool`
                              (dict_row + UUID→str loader). Reused by every
                              test; only one Postgres connection is ever
                              opened across the whole run.
- `db_conn` (function)      — checks out the conn from `_real_pool`, wraps
                              everything in `force_rollback=True`, yields a
                              `_TxnPool` shim that mimics
                              `AsyncConnectionPool.connection()`. On test
                              teardown, the transaction always rolls back —
                              guaranteeing test isolation.
- `client` (function)       — FastAPI test client. Monkeypatches
                              `app.db._pool` to point at the `_TxnPool`
                              shim, so every `db.fetch / fetchrow / db()`
                              call inside service code reaches the same
                              transactioned connection the test sees.
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from contextlib import asynccontextmanager
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
    # so the testcontainer + connection pool survive across tests.
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


class _TxnPool:
    """A drop-in replacement for `AsyncConnectionPool` that always hands out
    the same pre-checked-out, pre-transactioned connection.

    Tests need every `app.db.fetch / fetchrow / fetchval / execute / db()`
    call to land on the SAME connection — otherwise the per-test
    `force_rollback=True` transaction would only cover the connection the
    fixture happens to grab, not whatever connections services check out
    later. Pinning to one connection guarantees coverage.

    `__aexit__` deliberately does nothing: psycopg's real
    `pool.connection()` async-CM commits on clean exit; we suppress that
    so the outer `force_rollback` transaction stays in effect across many
    helper calls within a single test.
    """

    def __init__(self, conn):
        self._conn = conn

    @asynccontextmanager
    async def connection(self):
        yield self._conn


@pytest_asyncio.fixture
async def db_conn(pg_url):
    """Per-test connection in a `force_rollback=True` transaction.

    A fresh `AsyncConnectionPool` is built per test (cheap — min=max=1)
    because pytest-asyncio's per-function event loops don't tolerate a
    session-scoped pool whose worker tasks are pinned to the opening
    loop. The Postgres container itself is session-scoped (`pg_url`) —
    it's the pool, not the DB, that has to be re-created.

    Yields a `_TxnPool` shim mirroring `AsyncConnectionPool.connection()`.
    """
    from psycopg.rows import dict_row
    from psycopg_pool import AsyncConnectionPool

    from app.db import _configure_connection

    pool = AsyncConnectionPool(
        pg_url,
        min_size=1,
        max_size=1,
        open=False,
        kwargs={"row_factory": dict_row},
        configure=_configure_connection,
    )
    await pool.open()
    try:
        async with pool.connection() as conn:
            async with conn.transaction(force_rollback=True):
                yield _TxnPool(conn)
    finally:
        await pool.close()


@pytest_asyncio.fixture
async def client(db_conn, monkeypatch):
    """FastAPI app + httpx AsyncClient. Patches `app.db._pool` to use the
    test's `_TxnPool` shim so service code under test reaches the same
    transactioned connection."""
    from httpx import ASGITransport, AsyncClient

    import app.db as db_module

    monkeypatch.setattr(db_module, "_pool", db_conn)

    from app.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
