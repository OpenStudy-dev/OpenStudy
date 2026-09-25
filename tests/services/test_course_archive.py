"""Archived courses (finished semesters) are kept but hidden from the
dashboard. Archiving a course hides it together with every row that hangs
off it: slots, exams, deliverables, tasks, study topics, lectures, and its
fall-behind entry. Tasks without a course are never affected."""
from datetime import date, datetime, time, timedelta, timezone

import pytest

from app.auth import SENTINEL_USER_ID


async def _seed_two_courses():
    from app.schemas import (
        CourseCreate, CoursePatch, DeliverableCreate, ExamPatch, LectureCreate,
        SlotCreate, StudyTopicCreate, TaskCreate,
    )
    from app.services import (
        courses, deliverables, exams, lectures, slots, study_topics, tasks,
    )

    past = date.today() - timedelta(days=10)
    due = datetime.now(timezone.utc) + timedelta(days=3)
    for code in ("ACT", "OLD"):
        await courses.create_course(SENTINEL_USER_ID, CourseCreate(code=code, full_name=code))
        await slots.create_slot(SENTINEL_USER_ID, SlotCreate(
            course_code=code, kind="lecture", weekday=1,
            start_time=time(10, 0), end_time=time(12, 0),
        ))
        await exams.update_exam(SENTINEL_USER_ID, code, ExamPatch(duration_min=90))
        await deliverables.create_deliverable(SENTINEL_USER_ID, DeliverableCreate(
            course_code=code, name=f"{code} sheet", due_at=due,
        ))
        await tasks.create_task(SENTINEL_USER_ID, TaskCreate(title=f"{code} task", course_code=code))
        await study_topics.create_study_topic(SENTINEL_USER_ID, StudyTopicCreate(
            course_code=code, name=f"{code} topic", covered_on=past,
        ))
        await lectures.create_lecture(SENTINEL_USER_ID, LectureCreate(course_code=code, number=1))
    await tasks.create_task(SENTINEL_USER_ID, TaskCreate(title="no course"))
    await courses.update_course(SENTINEL_USER_ID, "OLD", CoursePatch(archived=True))


@pytest.mark.asyncio
async def test_course_archived_defaults_false_and_can_be_toggled(client, db_conn):
    from app.schemas import CourseCreate, CoursePatch
    from app.services import courses as svc

    created = await svc.create_course(SENTINEL_USER_ID, CourseCreate(code="ARC", full_name="A"))
    assert created.archived is False

    archived = await svc.update_course(SENTINEL_USER_ID, "ARC", CoursePatch(archived=True))
    assert archived.archived is True

    restored = await svc.update_course(SENTINEL_USER_ID, "ARC", CoursePatch(archived=False))
    assert restored.archived is False


@pytest.mark.asyncio
async def test_dashboard_hides_archived_course_and_everything_linked(client, db_conn):
    from app.services import dashboard

    await _seed_two_courses()
    s = await dashboard.get_dashboard_summary(SENTINEL_USER_ID)

    assert [c.code for c in s.courses] == ["ACT"]
    for rows in (s.slots, s.exams, s.deliverables, s.study_topics, s.lectures, s.fall_behind):
        assert {r.course_code for r in rows} == {"ACT"}, rows
    assert sorted(t.title for t in s.tasks) == ["ACT task", "no course"]


@pytest.mark.asyncio
async def test_dashboard_include_archived_returns_everything(client, db_conn):
    from app.services import dashboard

    await _seed_two_courses()
    s = await dashboard.get_dashboard_summary(SENTINEL_USER_ID, include_archived=True)

    assert [c.code for c in s.courses] == ["ACT", "OLD"]
    assert next(c for c in s.courses if c.code == "OLD").archived is True
    for rows in (s.slots, s.exams, s.deliverables, s.study_topics, s.lectures):
        assert {r.course_code for r in rows} == {"ACT", "OLD"}, rows
    assert len(s.tasks) == 3
    # Catch-up warnings are about the current semester only, even here.
    assert {f.course_code for f in s.fall_behind} == {"ACT"}


@pytest.mark.asyncio
async def test_dashboard_route_include_archived_param(db_conn, monkeypatch):
    from httpx import ASGITransport, AsyncClient

    import app.db as db_module
    from app.auth import _sentinel_user, require_user
    from app.main import create_app

    monkeypatch.setattr(db_module, "_pool", db_conn)
    await _seed_two_courses()
    app = create_app()
    app.dependency_overrides[require_user] = lambda: _sentinel_user()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        default = (await ac.get("/api/dashboard")).json()
        everything = (await ac.get("/api/dashboard", params={"include_archived": "true"})).json()

    assert [c["code"] for c in default["courses"]] == ["ACT"]
    assert [c["code"] for c in everything["courses"]] == ["ACT", "OLD"]


@pytest.mark.asyncio
async def test_list_courses_still_returns_archived_with_flag(client, db_conn):
    """/api/courses and MCP list_courses return every course; the flag lets
    callers (sidebar, Claude) decide."""
    from app.services import courses as svc

    await _seed_two_courses()
    flags = {c.code: c.archived for c in await svc.list_courses(SENTINEL_USER_ID)}
    assert flags == {"ACT": False, "OLD": True}
