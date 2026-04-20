"""Pydantic models mirroring the database schema (see db/migrations/0001_init.sql)."""
from datetime import date, datetime, time
from typing import Annotated, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

# A course code is a short uppercase identifier the user picks (e.g. "ASB", "CS101", "MATH").
# 1–8 characters, letters + digits.
CourseCode = Annotated[
    str,
    StringConstraints(min_length=1, max_length=8, pattern=r"^[A-Z0-9]+$"),
]
SlotKind = Literal["Vorlesung", "Übung", "Tutorium", "Praktikum"]
StudyTopicStatus = Literal[
    "not_started", "in_progress", "studied", "mastered", "struggling"
]
StudyTopicKind = Literal["vorlesung", "uebung", "reading"]
DeliverableKind = Literal["abgabe", "project", "praktikum", "block"]
DeliverableStatus = Literal[
    "open", "in_progress", "submitted", "graded", "skipped"
]
TaskStatus = Literal["open", "in_progress", "done", "skipped", "blocked"]
TaskPriority = Literal["low", "med", "high", "urgent"]
KlausurStatus = Literal["planned", "confirmed", "done"]
FallBehindSeverity = Literal["ok", "warn", "critical"]


# ---------- App settings ----------
class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    display_name: Optional[str] = None
    monogram: Optional[str] = None
    institution: Optional[str] = None
    semester_label: Optional[str] = None
    semester_start: Optional[date] = None
    semester_end: Optional[date] = None
    timezone: str = "UTC"
    locale: str = "en-US"


class AppSettingsPatch(BaseModel):
    display_name: Optional[str] = None
    monogram: Optional[str] = None
    institution: Optional[str] = None
    semester_label: Optional[str] = None
    semester_start: Optional[date] = None
    semester_end: Optional[date] = None
    timezone: Optional[str] = None
    locale: Optional[str] = None


# ---------- Course ----------
class CourseCreate(BaseModel):
    code: CourseCode
    full_name: str
    short_name: Optional[str] = None
    module_code: Optional[str] = None
    ects: Optional[int] = None
    prof: Optional[str] = None
    status_kind: Optional[str] = None
    language: Optional[str] = None
    color_hex: Optional[str] = None
    folder_name: Optional[str] = None
    klausur_weight: int = 100
    klausur_retries: Optional[int] = None
    notes: Optional[str] = None


class CoursePatch(BaseModel):
    full_name: Optional[str] = None
    short_name: Optional[str] = None
    module_code: Optional[str] = None
    ects: Optional[int] = None
    prof: Optional[str] = None
    status_kind: Optional[str] = None
    language: Optional[str] = None
    color_hex: Optional[str] = None
    folder_name: Optional[str] = None
    klausur_weight: Optional[int] = None
    klausur_retries: Optional[int] = None
    notes: Optional[str] = None


class Course(BaseModel):
    model_config = ConfigDict(extra="ignore")
    code: CourseCode
    full_name: str
    short_name: Optional[str] = None
    module_code: Optional[str] = None
    ects: Optional[int] = None
    prof: Optional[str] = None
    status_kind: Optional[str] = None
    language: Optional[str] = None
    color_hex: Optional[str] = None
    folder_name: Optional[str] = None
    klausur_weight: int = 100
    klausur_retries: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- Schedule slot ----------
class SlotCreate(BaseModel):
    course_code: CourseCode
    kind: SlotKind
    weekday: int = Field(ge=1, le=7)
    start_time: time
    end_time: time
    room: Optional[str] = None
    person: Optional[str] = None
    starts_on: Optional[date] = None
    ends_on: Optional[date] = None
    notes: Optional[str] = None


class SlotPatch(BaseModel):
    kind: Optional[SlotKind] = None
    weekday: Optional[int] = Field(default=None, ge=1, le=7)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room: Optional[str] = None
    person: Optional[str] = None
    starts_on: Optional[date] = None
    ends_on: Optional[date] = None
    notes: Optional[str] = None


class Slot(SlotCreate):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- Klausur ----------
class KlausurPatch(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_min: Optional[int] = None
    location: Optional[str] = None
    structure: Optional[str] = None
    aids_allowed: Optional[str] = None
    status: Optional[KlausurStatus] = None
    weight_pct: Optional[int] = None
    notes: Optional[str] = None


class Klausur(BaseModel):
    model_config = ConfigDict(extra="ignore")
    course_code: CourseCode
    scheduled_at: Optional[datetime] = None
    duration_min: Optional[int] = None
    location: Optional[str] = None
    structure: Optional[str] = None
    aids_allowed: Optional[str] = None
    status: KlausurStatus = "planned"
    weight_pct: int = 100
    notes: Optional[str] = None


# ---------- Study topic ----------
class StudyTopicCreate(BaseModel):
    course_code: CourseCode
    chapter: Optional[str] = None
    name: str
    description: Optional[str] = None
    kind: Optional[StudyTopicKind] = None
    covered_on: Optional[date] = None
    lecture_id: Optional[str] = None
    status: StudyTopicStatus = "not_started"
    confidence: Optional[int] = Field(default=None, ge=0, le=5)
    notes: Optional[str] = None
    sort_order: int = 0


class StudyTopicPatch(BaseModel):
    chapter: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    kind: Optional[StudyTopicKind] = None
    covered_on: Optional[date] = None
    lecture_id: Optional[str] = None
    status: Optional[StudyTopicStatus] = None
    confidence: Optional[int] = Field(default=None, ge=0, le=5)
    notes: Optional[str] = None
    sort_order: Optional[int] = None


class StudyTopic(StudyTopicCreate):
    id: str
    lecture_id: Optional[str] = None
    last_reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- Deliverable ----------
class DeliverableCreate(BaseModel):
    course_code: CourseCode
    kind: Optional[DeliverableKind] = None
    name: str
    available_at: Optional[datetime] = None
    due_at: datetime
    status: DeliverableStatus = "open"
    local_path: Optional[str] = None
    external_url: Optional[str] = None
    weight_info: Optional[str] = None
    notes: Optional[str] = None


class DeliverablePatch(BaseModel):
    kind: Optional[DeliverableKind] = None
    name: Optional[str] = None
    available_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    status: Optional[DeliverableStatus] = None
    local_path: Optional[str] = None
    external_url: Optional[str] = None
    weight_info: Optional[str] = None
    notes: Optional[str] = None


class Deliverable(DeliverableCreate):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- Task ----------
class TaskCreate(BaseModel):
    course_code: Optional[CourseCode] = None
    title: str
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    status: TaskStatus = "open"
    priority: TaskPriority = "med"
    tags: Optional[List[str]] = None


class TaskPatch(BaseModel):
    course_code: Optional[CourseCode] = None
    title: Optional[str] = None
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    tags: Optional[List[str]] = None


class Task(TaskCreate):
    id: str
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- Event ----------
class EventCreate(BaseModel):
    kind: str
    course_code: Optional[CourseCode] = None
    payload: Optional[dict] = None


class Event(EventCreate):
    id: str
    created_at: Optional[datetime] = None


# ---------- Lectures ----------
class LectureCreate(BaseModel):
    course_code: CourseCode
    number: Optional[int] = None
    held_on: Optional[date] = None
    kind: Optional[SlotKind] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    attended: bool = False
    notes: Optional[str] = None


class LecturePatch(BaseModel):
    number: Optional[int] = None
    held_on: Optional[date] = None
    kind: Optional[SlotKind] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    attended: Optional[bool] = None
    notes: Optional[str] = None


class Lecture(LectureCreate):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- Dashboard aggregates ----------
class FallBehindItem(BaseModel):
    course_code: CourseCode
    topics: List[StudyTopic]
    last_covered_on: Optional[date]
    next_lecture_at: Optional[datetime]
    severity: FallBehindSeverity


class DashboardSummary(BaseModel):
    now: datetime
    courses: List[Course]
    slots: List[Slot]
    klausuren: List[Klausur]
    deliverables: List[Deliverable]
    tasks: List[Task]
    study_topics: List[StudyTopic]
    lectures: List[Lecture]
    fall_behind: List[FallBehindItem]


# ---------- Auth ----------
class LoginRequest(BaseModel):
    password: str


class SessionInfo(BaseModel):
    authed: bool


# ---------- Bulk lecture helper ----------
class LectureTopicsAdd(BaseModel):
    course_code: CourseCode
    covered_on: date
    kind: StudyTopicKind = "vorlesung"
    topics: List[dict]  # list of {chapter?, name, status?, sort_order?}
    lecture_id: Optional[str] = None
    create_lecture: Optional[LectureCreate] = None  # if set, create lecture and link topics
