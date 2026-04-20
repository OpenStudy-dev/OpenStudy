from typing import List, Optional
from ..db import supabase
from ..schemas import Slot, SlotCreate, SlotPatch
from ._helpers import model_dump_clean


def list_slots(course_code: Optional[str] = None) -> List[Slot]:
    q = supabase().table("schedule_slots").select("*").order("weekday").order("start_time")
    if course_code:
        q = q.eq("course_code", course_code)
    resp = q.execute()
    return [Slot.model_validate(r) for r in resp.data or []]


def upsert_slot(slot: SlotCreate, slot_id: Optional[str] = None) -> Slot:
    data = model_dump_clean(slot)
    if slot_id:
        data["id"] = slot_id
    resp = supabase().table("schedule_slots").upsert(data).execute()
    return Slot.model_validate(resp.data[0])


def update_slot(slot_id: str, patch: SlotPatch) -> Slot:
    data = model_dump_clean(patch)
    if not data:
        raise ValueError("empty patch")
    resp = (
        supabase().table("schedule_slots").update(data).eq("id", slot_id).execute()
    )
    if not resp.data:
        raise ValueError(f"slot {slot_id} not found")
    return Slot.model_validate(resp.data[0])


def delete_slot(slot_id: str) -> None:
    supabase().table("schedule_slots").delete().eq("id", slot_id).execute()
