from datetime import datetime, timezone
from typing import List, Optional

from ..db import supabase
from ..schemas import Task, TaskCreate, TaskPatch
from ._helpers import model_dump_clean


def list_tasks(
    course_code: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_before: Optional[datetime] = None,
    tag: Optional[str] = None,
) -> List[Task]:
    q = supabase().table("tasks").select("*").order("due_at", desc=False)
    if course_code:
        q = q.eq("course_code", course_code)
    if status:
        q = q.eq("status", status)
    if priority:
        q = q.eq("priority", priority)
    if due_before:
        q = q.lte("due_at", due_before.isoformat())
    resp = q.execute()
    out = [Task.model_validate(r) for r in resp.data or []]
    if tag:
        out = [t for t in out if t.tags and tag in t.tags]
    return out


def create_task(payload: TaskCreate) -> Task:
    resp = supabase().table("tasks").insert(model_dump_clean(payload)).execute()
    return Task.model_validate(resp.data[0])


def update_task(task_id: str, patch: TaskPatch) -> Task:
    data = model_dump_clean(patch)
    if not data:
        raise ValueError("empty patch")
    if data.get("status") == "done":
        data.setdefault("completed_at", datetime.now(timezone.utc).isoformat())
    elif data.get("status") in ("open", "in_progress", "blocked", "skipped"):
        # Clear completed_at when moving back out of done
        data["completed_at"] = None
    resp = supabase().table("tasks").update(data).eq("id", task_id).execute()
    if not resp.data:
        raise ValueError(f"task {task_id} not found")
    return Task.model_validate(resp.data[0])


def reopen_task(task_id: str) -> Task:
    return update_task(task_id, TaskPatch(status="open"))


def complete_task(task_id: str) -> Task:
    return update_task(task_id, TaskPatch(status="done"))


def delete_task(task_id: str) -> None:
    supabase().table("tasks").delete().eq("id", task_id).execute()
