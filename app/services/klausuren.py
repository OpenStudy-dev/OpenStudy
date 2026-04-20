from typing import List
from ..db import supabase
from ..schemas import Klausur, KlausurPatch
from ._helpers import model_dump_clean


def list_klausuren() -> List[Klausur]:
    resp = supabase().table("klausuren").select("*").execute()
    return [Klausur.model_validate(r) for r in resp.data or []]


def get_klausur(course_code: str) -> Klausur | None:
    resp = (
        supabase()
        .table("klausuren")
        .select("*")
        .eq("course_code", course_code)
        .limit(1)
        .execute()
    )
    if not resp.data:
        return None
    return Klausur.model_validate(resp.data[0])


def update_klausur(course_code: str, patch: KlausurPatch) -> Klausur:
    data = model_dump_clean(patch)
    existing = get_klausur(course_code)
    if existing is None:
        payload = {"course_code": course_code, **data}
        resp = supabase().table("klausuren").insert(payload).execute()
    else:
        if not data:
            return existing
        resp = (
            supabase().table("klausuren").update(data).eq("course_code", course_code).execute()
        )
    return Klausur.model_validate(resp.data[0])
