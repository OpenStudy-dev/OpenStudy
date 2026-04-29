"""MCP tool tests — tasks entity (6 tools).

Coverage: list_tasks, create_task, update_task, complete_task, reopen_task,
delete_task.
"""
import pytest

from tests.mcp._harness import get_tool_fn


@pytest.mark.asyncio
async def test_list_empty(client, db_conn, mcp_server):
    list_tasks = get_tool_fn(mcp_server, "list_tasks")
    result = await list_tasks()
    assert result == []


@pytest.mark.asyncio
async def test_create_task_without_course(client, db_conn, mcp_server):
    create_task = get_tool_fn(mcp_server, "create_task")
    list_tasks = get_tool_fn(mcp_server, "list_tasks")

    created = await create_task(title="Buy groceries")
    assert created["title"] == "Buy groceries"
    assert created.get("course_code") is None
    assert created["status"] == "open"

    listed = await list_tasks()
    assert len(listed) == 1
    assert listed[0]["title"] == "Buy groceries"


@pytest.mark.asyncio
async def test_create_task_with_course(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    create_task = get_tool_fn(mcp_server, "create_task")

    await create_course(code="TASKA", full_name="Tasks Course A", ects=3)
    created = await create_task(title="Read chapter 1", course_code="TASKA")
    assert created["course_code"] == "TASKA"
    assert created["title"] == "Read chapter 1"


@pytest.mark.asyncio
async def test_create_task_missing_course_raises(client, db_conn, mcp_server):
    create_task = get_tool_fn(mcp_server, "create_task")
    with pytest.raises(Exception):
        await create_task(title="Orphan task", course_code="NOEXIST")


@pytest.mark.asyncio
async def test_update_task(client, db_conn, mcp_server):
    create_task = get_tool_fn(mcp_server, "create_task")
    update_task = get_tool_fn(mcp_server, "update_task")

    created = await create_task(title="Original title")
    updated = await update_task(task_id=created["id"], title="Renamed title")
    assert updated["title"] == "Renamed title"
    assert updated["id"] == created["id"]


@pytest.mark.asyncio
async def test_complete_task_sets_completed_at_then_reopen_clears_it(
    client, db_conn, mcp_server
):
    create_task = get_tool_fn(mcp_server, "create_task")
    complete_task = get_tool_fn(mcp_server, "complete_task")
    reopen_task = get_tool_fn(mcp_server, "reopen_task")

    created = await create_task(title="Finish me")
    assert created.get("completed_at") is None

    completed = await complete_task(task_id=created["id"])
    assert completed["status"] == "done"
    assert completed.get("completed_at") is not None

    reopened = await reopen_task(task_id=created["id"])
    assert reopened["status"] == "open"
    assert reopened.get("completed_at") is None


@pytest.mark.asyncio
async def test_delete_task(client, db_conn, mcp_server):
    create_task = get_tool_fn(mcp_server, "create_task")
    delete_task = get_tool_fn(mcp_server, "delete_task")
    list_tasks = get_tool_fn(mcp_server, "list_tasks")

    created = await create_task(title="Doomed")
    assert len(await list_tasks()) == 1
    await delete_task(task_id=created["id"])
    assert await list_tasks() == []
