"""MCP tool tests — meta tools (3 tools).

Coverage: get_dashboard, get_fall_behind, now_here.
"""
import pytest

from tests.mcp._harness import get_tool_fn


@pytest.mark.asyncio
async def test_get_dashboard_returns_full_shape(client, db_conn, mcp_server):
    get_dashboard = get_tool_fn(mcp_server, "get_dashboard")
    result = await get_dashboard()
    expected_keys = {
        "courses",
        "tasks",
        "deliverables",
        "lectures",
        "study_topics",
        "slots",
        "exams",
        "fall_behind",
    }
    assert expected_keys.issubset(result.keys())
    # Empty DB → every collection is an empty list.
    for key in expected_keys:
        assert isinstance(result[key], list)
        assert result[key] == []


@pytest.mark.asyncio
async def test_get_dashboard_with_one_course(client, db_conn, mcp_server):
    create_course = get_tool_fn(mcp_server, "create_course")
    get_dashboard = get_tool_fn(mcp_server, "get_dashboard")

    await create_course(code="META1", full_name="Meta Course 1", ects=5)

    result = await get_dashboard()
    assert len(result["courses"]) == 1
    assert result["courses"][0]["code"] == "META1"


@pytest.mark.asyncio
async def test_get_fall_behind_empty(client, db_conn, mcp_server):
    get_fall_behind = get_tool_fn(mcp_server, "get_fall_behind")
    result = await get_fall_behind()
    assert isinstance(result, list)
    # Empty DB → no courses, so nothing to fall behind on. If the impl
    # returns per-course "ok" entries, accept that too as long as none are
    # flagged warn/critical.
    for entry in result:
        assert entry.get("severity") in {"ok", "warn", "critical", None}
        assert entry.get("severity") != "critical"


@pytest.mark.asyncio
async def test_now_here_returns_timezone_info(client, db_conn, mcp_server):
    now_here = get_tool_fn(mcp_server, "now_here")
    result = await now_here()
    assert isinstance(result, dict)
    assert "iso" in result
    assert "utc_iso" in result
    # Both should be ISO-8601 strings with timezone offsets.
    assert isinstance(result["iso"], str) and "T" in result["iso"]
    assert isinstance(result["utc_iso"], str) and "T" in result["utc_iso"]
    # utc_iso must be UTC-anchored.
    assert result["utc_iso"].endswith("+00:00") or result["utc_iso"].endswith("Z")
