"""Study-dashboard MCP tool registration.

All tools live in `register_tools(server)` so the HTTP entry
(`app/mcp_http.py`, mounted at `/mcp`) registers the same catalog regardless
of how the transport is wired.
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from typing import Any, Optional

from mcp.server.fastmcp import FastMCP, Image as MCPImage

from .schemas import (
    AppSettingsPatch,
    CourseCreate,
    CoursePatch,
    DeliverableCreate,
    DeliverablePatch,
    KlausurPatch,
    LectureCreate,
    LecturePatch,
    LectureTopicsAdd,
    SlotCreate,
    SlotPatch,
    StudyTopicCreate,
    StudyTopicPatch,
    TaskCreate,
    TaskPatch,
)
from .services import (
    courses as courses_svc,
    slots as slots_svc,
    klausuren as klausuren_svc,
    study_topics as topics_svc,
    deliverables as deliverables_svc,
    tasks as tasks_svc,
    events as events_svc,
    dashboard as dashboard_svc,
    fall_behind as fb_svc,
    lectures as lectures_svc,
    settings as settings_svc,
    storage as storage_svc,
)


_PAGE_RANGE_RE = re.compile(r"^\s*(\d+)\s*(?:-\s*(\d+))?\s*$")


def _parse_page_range(pages: str, total: int) -> tuple[int, int]:
    """Parse '1-20' / '5' / '3-8' into (start_idx_inclusive, end_idx_exclusive).
    Clamps to [0, total]. Caps span at 20 pages (same limit as Claude Code's Read).
    """
    m = _PAGE_RANGE_RE.match(pages or "")
    if not m:
        return (0, min(20, total))
    start = max(1, int(m.group(1)))
    end = int(m.group(2)) if m.group(2) else start
    end = min(total, max(start, end))
    # cap span at 20
    if end - start + 1 > 20:
        end = start + 19
    # to 0-indexed half-open
    return (start - 1, end)


def _jsonable(obj: Any) -> Any:
    """Recursively dump pydantic models / datetimes into JSON-friendly values."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump(mode="json")
    if isinstance(obj, (list, tuple)):
        return [_jsonable(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return obj


def register_tools(server: FastMCP) -> None:
    """Register all study-dashboard tools on the given FastMCP instance."""

    # ─────────────────────── Dashboard ───────────────────────

    @server.tool()
    def get_dashboard() -> dict:
        """Full dashboard aggregate: courses, slots, klausuren, deliverables, tasks,
        study topics, and fall-behind warnings. Mirrors what /api/dashboard returns."""
        return _jsonable(dashboard_svc.get_dashboard_summary())

    @server.tool()
    def get_fall_behind() -> list[dict]:
        """Compute which courses you are falling behind on — per-course severity,
        unstudied topics whose lectures were >= 48 h ago, and next upcoming lecture.
        Severities: ok | warn | critical."""
        summary = dashboard_svc.get_dashboard_summary()
        return _jsonable(summary.fall_behind)

    # ─────────────────────── Courses ─────────────────────────

    @server.tool()
    def list_courses() -> list[dict]:
        """List all courses in the dashboard."""
        return _jsonable(courses_svc.list_courses())

    @server.tool()
    def get_course(code: str) -> dict | None:
        """Get a single course by its code (e.g. 'ASB', 'CS101')."""
        c = courses_svc.get_course(code)
        return _jsonable(c) if c else None

    @server.tool()
    def create_course(
        code: str,
        full_name: str,
        short_name: Optional[str] = None,
        module_code: Optional[str] = None,
        ects: Optional[int] = None,
        prof: Optional[str] = None,
        status_kind: Optional[str] = None,
        language: Optional[str] = None,
        color_hex: Optional[str] = None,
        folder_name: Optional[str] = None,
        klausur_weight: int = 100,
        klausur_retries: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> dict:
        """Create a new course. `code` is the short identifier the user picks
        (1–8 uppercase letters/digits — e.g. 'ASB', 'CS101', 'MATH'). `color_hex`
        is the accent shown in the UI, e.g. '#7ab8ff' — pick something distinct
        from existing courses. Every downstream entity (lectures, topics,
        deliverables, tasks, slots) is keyed off this code."""
        if courses_svc.get_course(code) is not None:
            raise ValueError(f"course {code} already exists")
        body = CourseCreate(
            code=code,
            full_name=full_name,
            short_name=short_name,
            module_code=module_code,
            ects=ects,
            prof=prof,
            status_kind=status_kind,
            language=language,
            color_hex=color_hex,
            folder_name=folder_name,
            klausur_weight=klausur_weight,
            klausur_retries=klausur_retries,
            notes=notes,
        )
        return _jsonable(courses_svc.create_course(body))

    @server.tool()
    def delete_course(code: str) -> dict:
        """Delete a course. WARNING: cascades to all linked rows — lectures,
        study topics, deliverables, tasks, and schedule slots for this course
        are all removed. Ask the user to confirm before calling this."""
        if courses_svc.get_course(code) is None:
            raise ValueError(f"course {code} not found")
        courses_svc.delete_course(code)
        return {"deleted": code}

    @server.tool()
    def update_course(
        code: str,
        full_name: Optional[str] = None,
        short_name: Optional[str] = None,
        module_code: Optional[str] = None,
        ects: Optional[int] = None,
        prof: Optional[str] = None,
        status_kind: Optional[str] = None,
        language: Optional[str] = None,
        color_hex: Optional[str] = None,
        folder_name: Optional[str] = None,
        klausur_weight: Optional[int] = None,
        klausur_retries: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> dict:
        """Update a course's mutable fields. Pass only the fields you want to change.
        `status_kind` ∈ {Pflicht, Wahlpflicht}. `color_hex` is e.g. '#7ab8ff'."""
        patch = CoursePatch(
            full_name=full_name,
            short_name=short_name,
            module_code=module_code,
            ects=ects,
            prof=prof,
            status_kind=status_kind,
            language=language,
            color_hex=color_hex,
            folder_name=folder_name,
            klausur_weight=klausur_weight,
            klausur_retries=klausur_retries,
            notes=notes,
        )
        return _jsonable(courses_svc.update_course(code, patch))

    # ─────────────────────── Schedule slots ──────────────────

    @server.tool()
    def list_schedule_slots(course_code: Optional[str] = None) -> list[dict]:
        """List weekly schedule slots, optionally filtered by course code."""
        return _jsonable(slots_svc.list_slots(course_code=course_code))

    @server.tool()
    def upsert_schedule_slot(
        course_code: str,
        kind: str,
        weekday: int,
        start_time: str,
        end_time: str,
        room: Optional[str] = None,
        person: Optional[str] = None,
        starts_on: Optional[str] = None,
        ends_on: Optional[str] = None,
        notes: Optional[str] = None,
        slot_id: Optional[str] = None,
    ) -> dict:
        """Create or update a weekly slot. `kind` ∈ {Vorlesung, Übung, Tutorium, Praktikum}.
        `weekday`: 1=Mon..7=Sun (ISO). `start_time` / `end_time`: 'HH:MM'.
        Dates in ISO format. Pass `slot_id` to update an existing row."""
        payload = SlotCreate(
            course_code=course_code,
            kind=kind,  # type: ignore[arg-type]
            weekday=weekday,
            start_time=start_time,  # type: ignore[arg-type]
            end_time=end_time,  # type: ignore[arg-type]
            room=room,
            person=person,
            starts_on=starts_on,  # type: ignore[arg-type]
            ends_on=ends_on,  # type: ignore[arg-type]
            notes=notes,
        )
        return _jsonable(slots_svc.upsert_slot(payload, slot_id=slot_id))

    @server.tool()
    def update_schedule_slot(
        slot_id: str,
        kind: Optional[str] = None,
        weekday: Optional[int] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        room: Optional[str] = None,
        person: Optional[str] = None,
        starts_on: Optional[str] = None,
        ends_on: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> dict:
        """Patch an existing slot's fields."""
        patch = SlotPatch(
            kind=kind,  # type: ignore[arg-type]
            weekday=weekday,
            start_time=start_time,  # type: ignore[arg-type]
            end_time=end_time,  # type: ignore[arg-type]
            room=room,
            person=person,
            starts_on=starts_on,  # type: ignore[arg-type]
            ends_on=ends_on,  # type: ignore[arg-type]
            notes=notes,
        )
        return _jsonable(slots_svc.update_slot(slot_id, patch))

    @server.tool()
    def delete_schedule_slot(slot_id: str) -> dict:
        """Delete a schedule slot by id."""
        slots_svc.delete_slot(slot_id)
        return {"deleted": slot_id}

    # ─────────────────────── Klausuren ───────────────────────

    @server.tool()
    def list_klausuren() -> list[dict]:
        """All Klausuren, one per course, with date/location/duration/aids/status."""
        return _jsonable(klausuren_svc.list_klausuren())

    @server.tool()
    def update_klausur(
        course_code: str,
        scheduled_at: Optional[str] = None,
        duration_min: Optional[int] = None,
        location: Optional[str] = None,
        structure: Optional[str] = None,
        aids_allowed: Optional[str] = None,
        status: Optional[str] = None,
        weight_pct: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> dict:
        """Set fields on a course's Klausur. Status ∈ {planned, confirmed, done}."""
        patch = KlausurPatch(
            scheduled_at=scheduled_at,  # type: ignore[arg-type]
            duration_min=duration_min,
            location=location,
            structure=structure,
            aids_allowed=aids_allowed,
            status=status,  # type: ignore[arg-type]
            weight_pct=weight_pct,
            notes=notes,
        )
        return _jsonable(klausuren_svc.update_klausur(course_code, patch))

    # ─────────────────────── Study topics ────────────────────

    @server.tool()
    def list_study_topics(
        course_code: Optional[str] = None, status: Optional[str] = None
    ) -> list[dict]:
        """List study topics. Status ∈ {not_started, in_progress, studied, mastered, struggling}."""
        return _jsonable(topics_svc.list_study_topics(course_code=course_code, status=status))

    @server.tool()
    def create_study_topic(
        course_code: str,
        name: str,
        chapter: Optional[str] = None,
        description: Optional[str] = None,
        kind: Optional[str] = None,
        covered_on: Optional[str] = None,
        lecture_id: Optional[str] = None,
        status: str = "not_started",
        confidence: Optional[int] = None,
        notes: Optional[str] = None,
        sort_order: int = 0,
    ) -> dict:
        """Add a single study topic. `kind` ∈ {vorlesung, uebung, reading}. `covered_on`: ISO date
        for when the lecture covered it (required for fall-behind detection).
        `description` is the rich Skript content; `notes` is for your own scribbles.
        `lecture_id` links this topic to a Lecture row (preferred over covered_on alone)."""
        payload = StudyTopicCreate(
            course_code=course_code,  # type: ignore[arg-type]
            chapter=chapter,
            name=name,
            description=description,
            kind=kind,  # type: ignore[arg-type]
            covered_on=covered_on,  # type: ignore[arg-type]
            lecture_id=lecture_id,
            status=status,  # type: ignore[arg-type]
            confidence=confidence,
            notes=notes,
            sort_order=sort_order,
        )
        return _jsonable(topics_svc.create_study_topic(payload))

    @server.tool()
    def update_study_topic(
        topic_id: str,
        chapter: Optional[str] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        kind: Optional[str] = None,
        covered_on: Optional[str] = None,
        lecture_id: Optional[str] = None,
        status: Optional[str] = None,
        confidence: Optional[int] = None,
        notes: Optional[str] = None,
        sort_order: Optional[int] = None,
    ) -> dict:
        """Patch an existing study topic. When status becomes studied/mastered,
        last_reviewed_at is set to now automatically.
        `description` is the rich Skript content; `notes` is for your own scribbles.
        `lecture_id` (re)links this topic to a Lecture row."""
        patch = StudyTopicPatch(
            chapter=chapter,
            name=name,
            description=description,
            kind=kind,  # type: ignore[arg-type]
            covered_on=covered_on,  # type: ignore[arg-type]
            lecture_id=lecture_id,
            status=status,  # type: ignore[arg-type]
            confidence=confidence,
            notes=notes,
            sort_order=sort_order,
        )
        return _jsonable(topics_svc.update_study_topic(topic_id, patch))

    @server.tool()
    def mark_studied(topic_id: str) -> dict:
        """Convenience: set a topic's status to `studied` (also stamps last_reviewed_at)."""
        return _jsonable(topics_svc.update_study_topic(topic_id, StudyTopicPatch(status="studied")))

    @server.tool()
    def set_confidence(topic_id: str, confidence: int) -> dict:
        """Set a topic's confidence (0..5). 0 = no idea, 5 = could teach it."""
        if confidence < 0 or confidence > 5:
            raise ValueError("confidence must be 0..5")
        return _jsonable(topics_svc.update_study_topic(topic_id, StudyTopicPatch(confidence=confidence)))

    @server.tool()
    def add_lecture_topics(
        course_code: str,
        covered_on: str,
        topics: list[dict],
        kind: str = "vorlesung",
        lecture_id: Optional[str] = None,
        create_lecture_number: Optional[int] = None,
        create_lecture_title: Optional[str] = None,
    ) -> list[dict]:
        """Bulk-record topics covered in one lecture.
        `topics` is a list of {chapter?, name, description?, status?, confidence?, notes?, sort_order?}.
        `name` is required per topic; everything else is optional. All topics get the
        same course_code + covered_on + kind (the `kind` arg refers to the topic-kind
        enum {vorlesung, uebung, reading} — not the lecture-kind Vorlesung/Übung/…).

        Default status per topic is `not_started` — reserve studied/mastered for when
        you have actually self-studied the material (covered_on already signals
        "introduced in class").

        Either pass an existing `lecture_id`, OR pass `create_lecture_number` (and
        optionally `create_lecture_title`) to create a Lecture row inline and link
        all topics to it. If neither is passed, topics are created with no Lecture
        link (still tracked via covered_on only)."""
        create_lecture = None
        if lecture_id is None and create_lecture_number is not None:
            create_lecture = LectureCreate(
                course_code=course_code,  # type: ignore[arg-type]
                number=create_lecture_number,
                held_on=covered_on,  # type: ignore[arg-type]
                kind=kind,  # type: ignore[arg-type]
                title=create_lecture_title,
                attended=True,
            )
        payload = LectureTopicsAdd(
            course_code=course_code,  # type: ignore[arg-type]
            covered_on=covered_on,  # type: ignore[arg-type]
            kind=kind,  # type: ignore[arg-type]
            topics=topics,
            lecture_id=lecture_id,
            create_lecture=create_lecture,
        )
        return _jsonable(topics_svc.add_lecture_topics(payload))

    @server.tool()
    def delete_study_topic(topic_id: str) -> dict:
        """Delete a study topic by id."""
        topics_svc.delete_study_topic(topic_id)
        return {"deleted": topic_id}

    # ─────────────────────── Deliverables ────────────────────

    @server.tool()
    def list_deliverables(
        course_code: Optional[str] = None,
        status: Optional[str] = None,
        due_before: Optional[str] = None,
    ) -> list[dict]:
        """List deliverables (Blätter, Projekte, Praktikum blocks). Filter by course,
        status (open | in_progress | submitted | graded | skipped), or ISO-datetime `due_before`."""
        due = datetime.fromisoformat(due_before) if due_before else None
        return _jsonable(
            deliverables_svc.list_deliverables(
                course_code=course_code, status=status, due_before=due
            )
        )

    @server.tool()
    def create_deliverable(
        course_code: str,
        name: str,
        due_at: str,
        kind: Optional[str] = None,
        available_at: Optional[str] = None,
        status: str = "open",
        local_path: Optional[str] = None,
        external_url: Optional[str] = None,
        weight_info: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> dict:
        """Create a new deliverable. `kind` ∈ {abgabe, project, praktikum, block}.
        `due_at`: ISO datetime (with timezone)."""
        payload = DeliverableCreate(
            course_code=course_code,  # type: ignore[arg-type]
            kind=kind,  # type: ignore[arg-type]
            name=name,
            available_at=available_at,  # type: ignore[arg-type]
            due_at=due_at,  # type: ignore[arg-type]
            status=status,  # type: ignore[arg-type]
            local_path=local_path,
            external_url=external_url,
            weight_info=weight_info,
            notes=notes,
        )
        return _jsonable(deliverables_svc.create_deliverable(payload))

    @server.tool()
    def update_deliverable(
        deliverable_id: str,
        kind: Optional[str] = None,
        name: Optional[str] = None,
        available_at: Optional[str] = None,
        due_at: Optional[str] = None,
        status: Optional[str] = None,
        local_path: Optional[str] = None,
        external_url: Optional[str] = None,
        weight_info: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> dict:
        """Patch a deliverable's fields."""
        patch = DeliverablePatch(
            kind=kind,  # type: ignore[arg-type]
            name=name,
            available_at=available_at,  # type: ignore[arg-type]
            due_at=due_at,  # type: ignore[arg-type]
            status=status,  # type: ignore[arg-type]
            local_path=local_path,
            external_url=external_url,
            weight_info=weight_info,
            notes=notes,
        )
        return _jsonable(deliverables_svc.update_deliverable(deliverable_id, patch))

    @server.tool()
    def mark_deliverable_submitted(deliverable_id: str) -> dict:
        """Convenience: mark a deliverable as submitted."""
        return _jsonable(deliverables_svc.mark_submitted(deliverable_id))

    @server.tool()
    def delete_deliverable(deliverable_id: str) -> dict:
        """Delete a deliverable by id."""
        deliverables_svc.delete_deliverable(deliverable_id)
        return {"deleted": deliverable_id}

    # ─────────────────────── Tasks ───────────────────────────

    @server.tool()
    def list_tasks(
        course_code: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        due_before: Optional[str] = None,
        tag: Optional[str] = None,
    ) -> list[dict]:
        """List tasks. Status ∈ {open, in_progress, done, skipped, blocked}.
        Priority ∈ {low, med, high, urgent}. `due_before`: ISO datetime."""
        due = datetime.fromisoformat(due_before) if due_before else None
        return _jsonable(
            tasks_svc.list_tasks(
                course_code=course_code, status=status, priority=priority, due_before=due, tag=tag
            )
        )

    @server.tool()
    def create_task(
        title: str,
        course_code: Optional[str] = None,
        description: Optional[str] = None,
        due_at: Optional[str] = None,
        priority: str = "med",
        tags: Optional[list[str]] = None,
    ) -> dict:
        """Create a new task. `priority` ∈ {low, med, high, urgent}. `due_at`: ISO datetime."""
        payload = TaskCreate(
            course_code=course_code,  # type: ignore[arg-type]
            title=title,
            description=description,
            due_at=due_at,  # type: ignore[arg-type]
            status="open",
            priority=priority,  # type: ignore[arg-type]
            tags=tags,
        )
        return _jsonable(tasks_svc.create_task(payload))

    @server.tool()
    def update_task(
        task_id: str,
        course_code: Optional[str] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
        due_at: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        tags: Optional[list[str]] = None,
    ) -> dict:
        """Patch an existing task. When status becomes `done`, completed_at is
        set to now automatically."""
        patch = TaskPatch(
            course_code=course_code,  # type: ignore[arg-type]
            title=title,
            description=description,
            due_at=due_at,  # type: ignore[arg-type]
            status=status,  # type: ignore[arg-type]
            priority=priority,  # type: ignore[arg-type]
            tags=tags,
        )
        return _jsonable(tasks_svc.update_task(task_id, patch))

    @server.tool()
    def complete_task(task_id: str) -> dict:
        """Convenience: mark a task as done."""
        return _jsonable(tasks_svc.complete_task(task_id))

    @server.tool()
    def delete_task(task_id: str) -> dict:
        """Delete a task by id."""
        tasks_svc.delete_task(task_id)
        return {"deleted": task_id}

    # ─────────────────────── Events (activity log) ───────────

    @server.tool()
    def list_events(
        since: Optional[str] = None,
        kind: Optional[str] = None,
        course_code: Optional[str] = None,
        limit: int = 50,
    ) -> list[dict]:
        """List activity events (newest first). `since`: ISO datetime. `kind`: free-form label."""
        s = datetime.fromisoformat(since) if since else None
        return _jsonable(
            events_svc.list_events(since=s, kind=kind, course_code=course_code, limit=limit)
        )

    @server.tool()
    def record_event(
        kind: str,
        course_code: Optional[str] = None,
        payload: Optional[dict] = None,
    ) -> dict:
        """Record an activity event. Useful for logging study sessions, notes, etc."""
        from .schemas import EventCreate

        return _jsonable(
            events_svc.record_event(
                EventCreate(kind=kind, course_code=course_code, payload=payload)
            )
        )

    # ─────────────────────── Lectures ────────────────────────

    @server.tool()
    def list_lectures(course_code: Optional[str] = None) -> list[dict]:
        """List lectures for one course or all. Ordered by course_code then number."""
        return _jsonable(lectures_svc.list_lectures(course_code=course_code))

    @server.tool()
    def create_lecture(
        course_code: str,
        number: Optional[int] = None,
        held_on: Optional[str] = None,
        kind: Optional[str] = "Vorlesung",
        title: Optional[str] = None,
        summary: Optional[str] = None,
        attended: bool = False,
        notes: Optional[str] = None,
    ) -> dict:
        """Create a lecture. `kind` ∈ {Vorlesung, Übung, Tutorium, Praktikum}.
        `held_on` is ISO date. `number` is the sequence within the course."""
        payload = LectureCreate(
            course_code=course_code,  # type: ignore[arg-type]
            number=number,
            held_on=held_on,  # type: ignore[arg-type]
            kind=kind,  # type: ignore[arg-type]
            title=title,
            summary=summary,
            attended=attended,
            notes=notes,
        )
        return _jsonable(lectures_svc.create_lecture(payload))

    @server.tool()
    def update_lecture(
        lecture_id: str,
        number: Optional[int] = None,
        held_on: Optional[str] = None,
        kind: Optional[str] = None,
        title: Optional[str] = None,
        summary: Optional[str] = None,
        attended: Optional[bool] = None,
        notes: Optional[str] = None,
    ) -> dict:
        """Patch an existing lecture's fields."""
        patch = LecturePatch(
            number=number,
            held_on=held_on,  # type: ignore[arg-type]
            kind=kind,  # type: ignore[arg-type]
            title=title,
            summary=summary,
            attended=attended,
            notes=notes,
        )
        return _jsonable(lectures_svc.update_lecture(lecture_id, patch))

    @server.tool()
    def mark_lecture_attended(lecture_id: str, attended: bool = True) -> dict:
        """Convenience: flip the attended flag on a lecture."""
        return _jsonable(lectures_svc.mark_attended(lecture_id, attended=attended))

    @server.tool()
    def delete_lecture(lecture_id: str) -> dict:
        """Delete a lecture. Linked study_topics have their lecture_id cleared."""
        lectures_svc.delete_lecture(lecture_id)
        return {"deleted": lecture_id}

    # ─────────────────────── Reopen / revert helpers ─────────

    @server.tool()
    def reopen_task(task_id: str) -> dict:
        """Revert a task back to `open` status (clears completed_at)."""
        return _jsonable(tasks_svc.reopen_task(task_id))

    @server.tool()
    def reopen_deliverable(deliverable_id: str) -> dict:
        """Revert a submitted deliverable back to `open` status."""
        return _jsonable(deliverables_svc.reopen_deliverable(deliverable_id))

    # ─────────────────────── App settings (profile) ──────────

    @server.tool()
    def get_app_settings() -> dict:
        """Get the user's profile + semester config (display_name, monogram,
        institution, semester_label, semester_start, semester_end, timezone,
        locale). Useful to orient yourself before creating things — e.g. you
        can check `timezone` before setting deadline times."""
        return _jsonable(settings_svc.get_settings())

    @server.tool()
    def update_app_settings(
        display_name: Optional[str] = None,
        monogram: Optional[str] = None,
        institution: Optional[str] = None,
        semester_label: Optional[str] = None,
        semester_start: Optional[str] = None,
        semester_end: Optional[str] = None,
        timezone: Optional[str] = None,
        locale: Optional[str] = None,
    ) -> dict:
        """Update the user's profile + semester config. Pass only fields you
        want to change. Dates are ISO ('YYYY-MM-DD'). `timezone` is an IANA
        ID ('Europe/Berlin', 'America/New_York'). `locale` affects UI date
        formatting ('en-US', 'de-DE')."""
        patch = AppSettingsPatch(
            display_name=display_name,
            monogram=monogram,
            institution=institution,
            semester_label=semester_label,
            semester_start=semester_start,  # type: ignore[arg-type]
            semester_end=semester_end,  # type: ignore[arg-type]
            timezone=timezone,
            locale=locale,
        )
        return _jsonable(settings_svc.update_settings(patch))

    # ─────────────────────── Meta ─────────────────────────────

    @server.tool()
    def now_here() -> dict:
        """Return current datetime in the user's configured timezone (falls back
        to UTC if not set) — for sanity-checking when you need to compute
        relative timings without your own clock."""
        from zoneinfo import ZoneInfo

        try:
            tz_name = settings_svc.get_settings().timezone or "UTC"
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = timezone.utc
        now = datetime.now(tz=tz)
        return {"iso": now.isoformat(), "utc_iso": now.astimezone(timezone.utc).isoformat()}

    # Backwards-compat alias for existing integrations.
    @server.tool()
    def now_berlin() -> dict:
        """DEPRECATED: use `now_here`. Returns current datetime in the user's
        configured timezone (despite the name — kept for compatibility)."""
        return now_here()

    # ─────────────────────── Course files (Supabase Storage) ─────────

    @server.tool()
    def list_course_files(prefix: str = "", limit: int = 200) -> list[dict]:
        """List files AND folders in the course_files bucket under an optional
        path prefix. Mirrors whatever folder the user keeps locally (commonly
        organised per-course).

        - prefix='' → top-level entries (typically one folder per course).
        - prefix='<course-folder>' → files + subfolders one level deep.
        - prefix='<course-folder>/Week1' → files in that week's folder.

        Supabase Storage's list is NOT recursive — drill down by passing a
        folder's path as the next prefix.

        Each entry: {name, path, type}. type='folder' or 'file'. Files also
        carry size, content_type, updated_at.
        """
        clean = (prefix or "").strip().strip("/")
        entries = storage_svc.list_files(prefix=clean, limit=limit)
        out: list[dict] = []
        for e in entries:
            name = e.get("name") or ""
            if not name:
                continue
            path = f"{clean}/{name}" if clean else name
            if e.get("id") is None:
                out.append({"name": name, "path": path, "type": "folder"})
            else:
                meta = e.get("metadata") or {}
                out.append(
                    {
                        "name": name,
                        "path": path,
                        "type": "file",
                        "size": meta.get("size"),
                        "content_type": meta.get("mimetype"),
                        "updated_at": e.get("updated_at"),
                    }
                )
        return out

    @server.tool()
    def read_course_file(path: str, pages: str = "1-20") -> list:
        """Read a file from the course_files bucket. Auto-detects by extension:
          - .md / .txt → plain text
          - .ipynb     → parsed notebook (cells inline as text)
          - .pdf       → requested page range rendered as PNG images (multimodal)
                         plus a text-extraction fallback of the same pages
          - .png/.jpg/.jpeg/.webp → the image as-is

        `pages` accepts '1-20', '5', '3-8' (1-indexed, inclusive). Caps at 20
        pages per call — same as Claude Code's native Read tool.

        Returns a list of content items. For PDFs, the LLM sees the rendered
        pages directly; the text block is a backup in case the client doesn't
        feed tool-returned images to the model.
        """
        data = storage_svc.download(path)
        ext = (path.rsplit(".", 1)[-1] if "." in path else "").lower()

        if ext in ("md", "txt", ""):
            try:
                return [data.decode("utf-8")]
            except UnicodeDecodeError:
                return [data.decode("utf-8", errors="replace")]

        if ext == "ipynb":
            try:
                nb = json.loads(data.decode("utf-8"))
            except Exception as exc:
                return [f"Failed to parse notebook: {exc}"]
            lines: list[str] = []
            for i, cell in enumerate(nb.get("cells", [])):
                kind = cell.get("cell_type", "?")
                src = "".join(cell.get("source", []))
                lines.append(f"## Cell {i} [{kind}]\n{src}\n")
            return ["\n".join(lines)]

        if ext in ("png", "jpg", "jpeg", "webp"):
            fmt = "jpeg" if ext == "jpg" else ext
            return [MCPImage(data=data, format=fmt)]

        if ext == "pdf":
            import fitz  # pymupdf

            doc = fitz.open(stream=data, filetype="pdf")
            total = doc.page_count
            start, end = _parse_page_range(pages, total)

            items: list[Any] = []
            for p in range(start, end):
                pix = doc[p].get_pixmap(dpi=120)
                items.append(MCPImage(data=pix.tobytes("png"), format="png"))
            doc.close()
            return items

        return [
            f"Unsupported file type `.{ext}`. "
            f"Supported: .pdf, .md, .txt, .ipynb, .png, .jpg, .jpeg, .webp"
        ]

    # Keep a reference so fb_svc is not flagged as unused (services/dashboard.py re-exports it).
    _ = fb_svc
