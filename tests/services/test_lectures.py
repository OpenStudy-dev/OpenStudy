"""Tests for app/services/lectures.py."""
from datetime import date

import pytest


async def _seed_course(db_pool, code: str = "TEST") -> None:
    """Insert a courses row so lecture FK constraint is satisfied."""
    async with db_pool.connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO courses (code, full_name) VALUES (%s, %s) "
            "ON CONFLICT DO NOTHING",
            (code, f"Test course {code}"),
        )


@pytest.mark.asyncio
async def test_list_lectures_empty(client, db_pool):
    from app.services import lectures as svc
    result = await svc.list_lectures()
    assert result == []


@pytest.mark.asyncio
async def test_create_then_list(client, db_pool):
    from app.schemas import LectureCreate
    from app.services import lectures as svc
    await _seed_course(db_pool, "LEC1")
    created = await svc.create_lecture(LectureCreate(
        course_code="LEC1",
        number=1,
        held_on=date(2026, 4, 15),
        kind="lecture",
        title="Intro",
        summary="First session",
        attended=False,
    ))
    assert created.course_code == "LEC1"
    assert created.number == 1
    assert created.held_on == date(2026, 4, 15)
    assert created.kind == "lecture"
    assert created.title == "Intro"
    assert created.attended is False
    assert created.id  # uuid string

    result = await svc.list_lectures()
    assert len(result) == 1
    assert result[0].id == created.id


@pytest.mark.asyncio
async def test_list_lectures_filtered_by_course(client, db_pool):
    from app.schemas import LectureCreate
    from app.services import lectures as svc
    await _seed_course(db_pool, "AAA")
    await _seed_course(db_pool, "BBB")
    await svc.create_lecture(LectureCreate(
        course_code="AAA", number=1, held_on=date(2026, 4, 1), kind="lecture",
    ))
    await svc.create_lecture(LectureCreate(
        course_code="BBB", number=1, held_on=date(2026, 4, 2), kind="exercise",
    ))
    only_aaa = await svc.list_lectures(course_code="AAA")
    assert len(only_aaa) == 1
    assert only_aaa[0].course_code == "AAA"
    only_bbb = await svc.list_lectures(course_code="BBB")
    assert len(only_bbb) == 1
    assert only_bbb[0].course_code == "BBB"


@pytest.mark.asyncio
async def test_get_lecture_missing(client, db_pool):
    from app.services import lectures as svc
    result = await svc.get_lecture("00000000-0000-0000-0000-000000000000")
    assert result is None


@pytest.mark.asyncio
async def test_get_lecture_returns_existing(client, db_pool):
    from app.schemas import LectureCreate
    from app.services import lectures as svc
    await _seed_course(db_pool, "GET")
    created = await svc.create_lecture(LectureCreate(
        course_code="GET", number=2, held_on=date(2026, 4, 10), kind="lecture",
        title="Lookup",
    ))
    fetched = await svc.get_lecture(created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.title == "Lookup"


@pytest.mark.asyncio
async def test_update_lecture(client, db_pool):
    from app.schemas import LectureCreate, LecturePatch
    from app.services import lectures as svc
    await _seed_course(db_pool, "UPD")
    created = await svc.create_lecture(LectureCreate(
        course_code="UPD", number=3, held_on=date(2026, 4, 5), kind="lecture",
        title="Original", attended=False,
    ))
    updated = await svc.update_lecture(
        created.id, LecturePatch(title="Renamed", attended=True)
    )
    assert updated.title == "Renamed"
    assert updated.attended is True
    assert updated.kind == "lecture"  # unchanged
    assert updated.id == created.id


@pytest.mark.asyncio
async def test_update_lecture_empty_patch_raises(client, db_pool):
    from app.schemas import LecturePatch
    from app.services import lectures as svc
    with pytest.raises(ValueError):
        await svc.update_lecture(
            "00000000-0000-0000-0000-000000000000",
            LecturePatch(),
        )


@pytest.mark.asyncio
async def test_update_lecture_missing_id_raises(client, db_pool):
    from app.schemas import LecturePatch
    from app.services import lectures as svc
    with pytest.raises(ValueError):
        await svc.update_lecture(
            "00000000-0000-0000-0000-000000000000",
            LecturePatch(title="ghost"),
        )


@pytest.mark.asyncio
async def test_mark_attended(client, db_pool):
    from app.schemas import LectureCreate
    from app.services import lectures as svc
    await _seed_course(db_pool, "ATT")
    created = await svc.create_lecture(LectureCreate(
        course_code="ATT", number=1, held_on=date(2026, 4, 20), kind="lecture",
        attended=False,
    ))
    marked = await svc.mark_attended(created.id, attended=True)
    assert marked.attended is True
    assert marked.id == created.id
    # toggle off
    unmarked = await svc.mark_attended(created.id, attended=False)
    assert unmarked.attended is False


@pytest.mark.asyncio
async def test_delete_lecture(client, db_pool):
    from app.schemas import LectureCreate
    from app.services import lectures as svc
    await _seed_course(db_pool, "DEL")
    created = await svc.create_lecture(LectureCreate(
        course_code="DEL", number=1, held_on=date(2026, 4, 1), kind="lecture",
    ))
    await svc.delete_lecture(created.id)
    assert await svc.get_lecture(created.id) is None
