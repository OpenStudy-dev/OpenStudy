from datetime import datetime
from typing import List, Optional

from ..db import supabase
from ..schemas import Event, EventCreate
from ._helpers import model_dump_clean


def list_events(
    since: Optional[datetime] = None,
    kind: Optional[str] = None,
    course_code: Optional[str] = None,
    limit: int = 100,
) -> List[Event]:
    q = supabase().table("events").select("*").order("created_at", desc=True).limit(limit)
    if since:
        q = q.gte("created_at", since.isoformat())
    if kind:
        q = q.eq("kind", kind)
    if course_code:
        q = q.eq("course_code", course_code)
    resp = q.execute()
    return [Event.model_validate(r) for r in resp.data or []]


def record_event(payload: EventCreate) -> Event:
    resp = supabase().table("events").insert(model_dump_clean(payload)).execute()
    return Event.model_validate(resp.data[0])
