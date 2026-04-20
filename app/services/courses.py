from typing import List
from ..db import supabase
from ..schemas import Course, CourseCreate, CoursePatch


def list_courses() -> List[Course]:
    resp = supabase().table("courses").select("*").order("code").execute()
    return [Course.model_validate(r) for r in resp.data or []]


def get_course(code: str) -> Course | None:
    resp = supabase().table("courses").select("*").eq("code", code).limit(1).execute()
    if not resp.data:
        return None
    return Course.model_validate(resp.data[0])


def create_course(body: CourseCreate) -> Course:
    data = body.model_dump(mode="json", exclude_none=True)
    resp = supabase().table("courses").insert(data).execute()
    if not resp.data:
        raise ValueError(f"failed to create course {body.code}")
    return Course.model_validate(resp.data[0])


def update_course(code: str, patch: CoursePatch) -> Course:
    data = patch.model_dump(mode="json", exclude_none=True, exclude_unset=True)
    if not data:
        course = get_course(code)
        if not course:
            raise ValueError(f"course {code} not found")
        return course
    resp = (
        supabase().table("courses").update(data).eq("code", code).execute()
    )
    if not resp.data:
        raise ValueError(f"course {code} not found")
    return Course.model_validate(resp.data[0])


def delete_course(code: str) -> None:
    supabase().table("courses").delete().eq("code", code).execute()
