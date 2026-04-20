from datetime import datetime, timezone
from typing import List, Optional

from ..db import supabase
from ..schemas import LectureTopicsAdd, StudyTopic, StudyTopicCreate, StudyTopicPatch
from ._helpers import model_dump_clean


def list_study_topics(
    course_code: Optional[str] = None, status: Optional[str] = None
) -> List[StudyTopic]:
    q = (
        supabase()
        .table("study_topics")
        .select("*")
        .order("course_code")
        .order("sort_order")
    )
    if course_code:
        q = q.eq("course_code", course_code)
    if status:
        q = q.eq("status", status)
    resp = q.execute()
    return [StudyTopic.model_validate(r) for r in resp.data or []]


def create_study_topic(payload: StudyTopicCreate) -> StudyTopic:
    resp = supabase().table("study_topics").insert(model_dump_clean(payload)).execute()
    return StudyTopic.model_validate(resp.data[0])


def update_study_topic(topic_id: str, patch: StudyTopicPatch) -> StudyTopic:
    data = model_dump_clean(patch)
    if not data:
        raise ValueError("empty patch")
    if data.get("status") in ("studied", "mastered"):
        data["last_reviewed_at"] = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase().table("study_topics").update(data).eq("id", topic_id).execute()
    )
    if not resp.data:
        raise ValueError(f"study topic {topic_id} not found")
    return StudyTopic.model_validate(resp.data[0])


def delete_study_topic(topic_id: str) -> None:
    supabase().table("study_topics").delete().eq("id", topic_id).execute()


def add_lecture_topics(payload: LectureTopicsAdd) -> List[StudyTopic]:
    # Resolve/create the lecture if needed
    lecture_id = payload.lecture_id
    if payload.create_lecture and not lecture_id:
        from . import lectures as lectures_svc
        lec = lectures_svc.create_lecture(payload.create_lecture)
        lecture_id = lec.id
    rows = []
    for idx, t in enumerate(payload.topics):
        row = {
            "course_code": payload.course_code,
            "chapter": t.get("chapter"),
            "name": t["name"],
            "description": t.get("description"),
            "kind": payload.kind,
            "covered_on": payload.covered_on.isoformat(),
            "lecture_id": lecture_id,
            "status": t.get("status", "not_started"),
            "confidence": t.get("confidence"),
            "notes": t.get("notes"),
            "sort_order": t.get("sort_order", idx),
        }
        rows.append({k: v for k, v in row.items() if v is not None})
    resp = supabase().table("study_topics").insert(rows).execute()
    return [StudyTopic.model_validate(r) for r in resp.data or []]
