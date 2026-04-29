"""MCP tool tests — deliverables entity (6 tools).

Coverage: list_deliverables, create_deliverable, update_deliverable,
mark_deliverable_submitted, reopen_deliverable, delete_deliverable.
"""
import pytest

from tests.mcp._harness import get_tool_fn


@pytest.mark.asyncio
async def test_list_empty(client, db_conn, mcp_server):
    list_deliverables = get_tool_fn(mcp_server, "list_deliverables")
    result = await list_deliverables()
    assert result == []


@pytest.mark.asyncio
async def test_create_then_list(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    create_deliverable = get_tool_fn(mcp_server, "create_deliverable")
    list_deliverables = get_tool_fn(mcp_server, "list_deliverables")

    await create_course(code="DELA", full_name="Deliverable Course A", ects=5)
    created = await create_deliverable(
        course_code="DELA",
        name="Problem Set 1",
        due_at="2026-12-31T23:59:00+00:00",
    )
    assert created["course_code"] == "DELA"
    assert created["name"] == "Problem Set 1"

    listed = await list_deliverables()
    assert len(listed) == 1
    assert listed[0]["name"] == "Problem Set 1"


@pytest.mark.asyncio
async def test_create_with_missing_course_raises(client, db_conn, mcp_server):
    create_deliverable = get_tool_fn(mcp_server, "create_deliverable")
    with pytest.raises(Exception):
        await create_deliverable(
            course_code="NOPECOURSE",
            name="Orphan",
            due_at="2026-12-31T23:59:00+00:00",
        )


@pytest.mark.asyncio
async def test_update_deliverable(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    create_deliverable = get_tool_fn(mcp_server, "create_deliverable")
    update_deliverable = get_tool_fn(mcp_server, "update_deliverable")

    await create_course(code="DELB", full_name="Deliverable Course B", ects=3)
    created = await create_deliverable(
        course_code="DELB",
        name="Original Name",
        due_at="2026-12-31T23:59:00+00:00",
    )
    updated = await update_deliverable(
        deliverable_id=created["id"], name="Renamed"
    )
    assert updated["name"] == "Renamed"
    assert updated["id"] == created["id"]


@pytest.mark.asyncio
async def test_mark_submitted_then_reopen(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    create_deliverable = get_tool_fn(mcp_server, "create_deliverable")
    mark_submitted = get_tool_fn(mcp_server, "mark_deliverable_submitted")
    reopen = get_tool_fn(mcp_server, "reopen_deliverable")

    await create_course(code="DELC", full_name="Deliverable Course C", ects=2)
    created = await create_deliverable(
        course_code="DELC",
        name="Lab 1",
        due_at="2026-12-31T23:59:00+00:00",
    )
    assert created["status"] == "open"

    submitted = await mark_submitted(deliverable_id=created["id"])
    assert submitted["status"] == "submitted"

    reopened = await reopen(deliverable_id=created["id"])
    assert reopened["status"] == "open"


@pytest.mark.asyncio
async def test_list_filtered_by_course(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    create_deliverable = get_tool_fn(mcp_server, "create_deliverable")
    list_deliverables = get_tool_fn(mcp_server, "list_deliverables")

    await create_course(code="DELD", full_name="Deliverable Course D", ects=4)
    await create_course(code="DELE", full_name="Deliverable Course E", ects=4)
    await create_deliverable(
        course_code="DELD",
        name="D-PS1",
        due_at="2026-12-31T23:59:00+00:00",
    )
    await create_deliverable(
        course_code="DELE",
        name="E-PS1",
        due_at="2026-12-31T23:59:00+00:00",
    )

    only_d = await list_deliverables(course_code="DELD")
    assert len(only_d) == 1
    assert only_d[0]["name"] == "D-PS1"
    assert only_d[0]["course_code"] == "DELD"


@pytest.mark.asyncio
async def test_delete_deliverable(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    create_deliverable = get_tool_fn(mcp_server, "create_deliverable")
    delete_deliverable = get_tool_fn(mcp_server, "delete_deliverable")
    list_deliverables = get_tool_fn(mcp_server, "list_deliverables")

    await create_course(code="DELF", full_name="Deliverable Course F", ects=1)
    created = await create_deliverable(
        course_code="DELF",
        name="Doomed",
        due_at="2026-12-31T23:59:00+00:00",
    )
    assert len(await list_deliverables()) == 1
    await delete_deliverable(deliverable_id=created["id"])
    assert await list_deliverables() == []
