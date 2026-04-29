"""MCP tool tests — lectures entity (5 tools).

Coverage: list_lectures, create_lecture, update_lecture,
mark_lecture_attended, delete_lecture.
"""
import pytest

from tests.mcp._harness import get_tool_fn


@pytest.mark.asyncio
async def test_list_empty(client, db_conn, mcp_server):
    list_lectures = get_tool_fn(mcp_server, "list_lectures")
    result = await list_lectures()
    assert result == []


@pytest.mark.asyncio
async def test_create_then_list(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    create_lecture = get_tool_fn(mcp_server, "create_lecture")
    list_lectures = get_tool_fn(mcp_server, "list_lectures")

    await create_course(code="LECA", full_name="Lecture Course A", ects=5)
    created = await create_lecture(
        course_code="LECA",
        number=1,
        held_on="2026-04-01",
        kind="lecture",
        title="Intro",
    )
    assert created["course_code"] == "LECA"
    assert created["number"] == 1
    assert created["title"] == "Intro"

    listed = await list_lectures()
    assert len(listed) == 1
    assert listed[0]["course_code"] == "LECA"


@pytest.mark.asyncio
async def test_create_with_missing_course_raises(client, db_conn, mcp_server):
    create_lecture = get_tool_fn(mcp_server, "create_lecture")
    with pytest.raises(Exception):
        await create_lecture(
            course_code="NOPE",
            number=1,
            held_on="2026-04-01",
            kind="lecture",
        )


@pytest.mark.asyncio
async def test_update_lecture(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    create_lecture = get_tool_fn(mcp_server, "create_lecture")
    update_lecture = get_tool_fn(mcp_server, "update_lecture")

    await create_course(code="LECB", full_name="Lecture Course B", ects=4)
    created = await create_lecture(
        course_code="LECB",
        number=2,
        held_on="2026-04-08",
        kind="lecture",
        title="Original",
    )
    updated = await update_lecture(lecture_id=created["id"], title="Renamed")
    assert updated["title"] == "Renamed"
    assert updated["id"] == created["id"]


@pytest.mark.asyncio
async def test_mark_attended_toggles_flag(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    create_lecture = get_tool_fn(mcp_server, "create_lecture")
    mark_lecture_attended = get_tool_fn(mcp_server, "mark_lecture_attended")

    await create_course(code="LECA", full_name="Lecture Course A", ects=5)
    created = await create_lecture(
        course_code="LECA",
        number=3,
        held_on="2026-04-15",
        kind="lecture",
        attended=False,
    )
    assert created["attended"] is False

    flipped = await mark_lecture_attended(lecture_id=created["id"])
    assert flipped["attended"] is True


@pytest.mark.asyncio
async def test_delete_lecture(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    create_lecture = get_tool_fn(mcp_server, "create_lecture")
    delete_lecture = get_tool_fn(mcp_server, "delete_lecture")
    list_lectures = get_tool_fn(mcp_server, "list_lectures")

    await create_course(code="LECB", full_name="Lecture Course B", ects=4)
    created = await create_lecture(
        course_code="LECB",
        number=1,
        held_on="2026-04-22",
        kind="lecture",
    )
    assert len(await list_lectures()) == 1
    await delete_lecture(lecture_id=created["id"])
    assert await list_lectures() == []
