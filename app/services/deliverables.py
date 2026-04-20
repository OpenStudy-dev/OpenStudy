from datetime import datetime, timezone
from typing import List, Optional

from ..db import supabase
from ..schemas import Deliverable, DeliverableCreate, DeliverablePatch
from ._helpers import model_dump_clean


def list_deliverables(
    course_code: Optional[str] = None,
    status: Optional[str] = None,
    due_before: Optional[datetime] = None,
) -> List[Deliverable]:
    q = supabase().table("deliverables").select("*").order("due_at")
    if course_code:
        q = q.eq("course_code", course_code)
    if status:
        q = q.eq("status", status)
    if due_before:
        q = q.lte("due_at", due_before.isoformat())
    resp = q.execute()
    return [Deliverable.model_validate(r) for r in resp.data or []]


def create_deliverable(payload: DeliverableCreate) -> Deliverable:
    resp = supabase().table("deliverables").insert(model_dump_clean(payload)).execute()
    return Deliverable.model_validate(resp.data[0])


def update_deliverable(deliverable_id: str, patch: DeliverablePatch) -> Deliverable:
    data = model_dump_clean(patch)
    if not data:
        raise ValueError("empty patch")
    resp = (
        supabase().table("deliverables").update(data).eq("id", deliverable_id).execute()
    )
    if not resp.data:
        raise ValueError(f"deliverable {deliverable_id} not found")
    return Deliverable.model_validate(resp.data[0])


def mark_submitted(deliverable_id: str) -> Deliverable:
    return update_deliverable(deliverable_id, DeliverablePatch(status="submitted"))


def reopen_deliverable(deliverable_id: str) -> Deliverable:
    return update_deliverable(deliverable_id, DeliverablePatch(status="open"))


def delete_deliverable(deliverable_id: str) -> None:
    supabase().table("deliverables").delete().eq("id", deliverable_id).execute()


__all__ = [
    "list_deliverables",
    "create_deliverable",
    "update_deliverable",
    "mark_submitted",
    "reopen_deliverable",
    "delete_deliverable",
]


# Keep alias symbol used but silence unused import warning
_ = timezone
