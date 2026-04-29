"""Smoke test for the test fixtures themselves — proves the testcontainer
spins up, the migration runs, and we can query the resulting schema."""
import pytest


@pytest.mark.asyncio
async def test_pg_container_has_baseline_schema(db_pool):
    async with db_pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT count(*) AS n FROM information_schema.tables "
                "WHERE table_schema = 'public'"
            )
            row = await cur.fetchone()
            # baseline.sql + the rls_auto_enable drop migration creates ≥14 tables
            # (courses, lectures, study_topics, deliverables, tasks, exams,
            # schedule_slots, app_settings, oauth_tokens, oauth_clients,
            # oauth_auth_codes, login_attempts, events, file_index, _migrations)
            assert row["n"] >= 14, f"expected ≥14 tables, got {row['n']}"
