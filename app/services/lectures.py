from typing import List, Optional

from .. import db
from ..schemas import Lecture, LectureCreate, LecturePatch


async def list_lectures(course_code: Optional[str] = None) -> List[Lecture]:
    if course_code:
        rows = await db.fetch(
            "SELECT * FROM lectures WHERE course_code = %s "
            "ORDER BY course_code, number",
            course_code,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM lectures ORDER BY course_code, number"
        )
    return [Lecture.model_validate(r) for r in rows]


async def get_lecture(lecture_id: str) -> Optional[Lecture]:
    row = await db.fetchrow(
        "SELECT * FROM lectures WHERE id = %s LIMIT 1",
        lecture_id,
    )
    return Lecture.model_validate(row) if row else None


async def create_lecture(payload: LectureCreate) -> Lecture:
    data = payload.model_dump(mode="json", exclude_none=True)
    cols = list(data.keys())
    placeholders = ", ".join(["%s"] * len(cols))
    row = await db.fetchrow(
        f"INSERT INTO lectures ({', '.join(cols)}) "
        f"VALUES ({placeholders}) RETURNING *",
        *[data[c] for c in cols],
    )
    if row is None:
        raise ValueError(f"failed to create lecture for {payload.course_code}")
    return Lecture.model_validate(row)


async def update_lecture(lecture_id: str, patch: LecturePatch) -> Lecture:
    data = patch.model_dump(mode="json", exclude_none=True, exclude_unset=True)
    if not data:
        raise ValueError("empty patch")
    cols = list(data.keys())
    set_clause = ", ".join(f"{c} = %s" for c in cols)
    row = await db.fetchrow(
        f"UPDATE lectures SET {set_clause} WHERE id = %s RETURNING *",
        *[data[c] for c in cols], lecture_id,
    )
    if row is None:
        raise ValueError(f"lecture {lecture_id} not found")
    return Lecture.model_validate(row)


async def mark_attended(lecture_id: str, attended: bool = True) -> Lecture:
    return await update_lecture(lecture_id, LecturePatch(attended=attended))


async def delete_lecture(lecture_id: str) -> None:
    await db.execute("DELETE FROM lectures WHERE id = %s", lecture_id)
