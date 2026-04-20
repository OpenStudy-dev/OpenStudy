"""Pure fall-behind computation (Python mirror of web/src/lib/fall-behind.ts)."""
from datetime import datetime, timedelta, timezone, time as dtime
from typing import List, Optional
from zoneinfo import ZoneInfo

from ..schemas import Course, FallBehindItem, FallBehindSeverity, Slot, StudyTopic

BERLIN = ZoneInfo("Europe/Berlin")
BEHIND_GRACE_HOURS = 48
CRITICAL_WINDOW_HOURS = 48
IMMINENT_LECTURE_HOURS = 72


def _utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def next_lecture_at(code: str, slots: List[Slot], now: datetime) -> Optional[datetime]:
    now_utc = _utc(now)
    berlin_now = now_utc.astimezone(BERLIN)
    relevant = [s for s in slots if s.course_code == code and s.kind in ("lecture", "exercise")]
    if not relevant:
        return None
    candidate: Optional[datetime] = None
    for delta in range(0, 8):
        target_day = (berlin_now + timedelta(days=delta)).date()
        weekday_iso = target_day.isoweekday()  # 1..7
        for s in relevant:
            if s.weekday != weekday_iso:
                continue
            if s.starts_on and target_day < s.starts_on:
                continue
            scheduled_berlin = datetime.combine(target_day, s.start_time, tzinfo=BERLIN)
            if scheduled_berlin <= berlin_now:
                continue
            if candidate is None or scheduled_berlin < candidate:
                candidate = scheduled_berlin
        if candidate and candidate.date() == target_day:
            break
    return candidate.astimezone(timezone.utc) if candidate else None


def compute_fall_behind(
    courses: List[Course],
    topics: List[StudyTopic],
    slots: List[Slot],
    now: datetime,
) -> List[FallBehindItem]:
    now_utc = _utc(now)
    result: List[FallBehindItem] = []
    for c in courses:
        course_topics = [t for t in topics if t.course_code == c.code]
        next_at = next_lecture_at(c.code, slots, now_utc)
        imminent = (
            next_at is not None
            and (next_at - now_utc).total_seconds() / 3600 <= IMMINENT_LECTURE_HOURS
        )
        behind = []
        for t in course_topics:
            if t.status not in ("not_started", "in_progress"):
                continue
            if t.covered_on is None:
                continue
            covered_dt = datetime.combine(t.covered_on, dtime(0, 0), tzinfo=BERLIN).astimezone(
                timezone.utc
            )
            if covered_dt > now_utc:
                continue
            hours_since = (now_utc - covered_dt).total_seconds() / 3600
            if hours_since >= BEHIND_GRACE_HOURS or imminent:
                behind.append(t)
        severity: FallBehindSeverity = "ok"
        if behind:
            if next_at and (next_at - now_utc).total_seconds() / 3600 <= CRITICAL_WINDOW_HOURS:
                severity = "critical"
            else:
                severity = "warn"
        last_covered = max((t.covered_on for t in behind if t.covered_on), default=None)
        result.append(
            FallBehindItem(
                course_code=c.code,
                topics=behind,
                last_covered_on=last_covered,
                next_lecture_at=next_at,
                severity=severity,
            )
        )
    return result


def course_progress(code: str, topics: List[StudyTopic]) -> int:
    weights = {
        "not_started": 0.0,
        "struggling": 0.2,
        "in_progress": 0.5,
        "studied": 0.9,
        "mastered": 1.0,
    }
    course_topics = [t for t in topics if t.course_code == code]
    if not course_topics:
        return 0
    total = sum(weights.get(t.status, 0.0) for t in course_topics)
    return round((total / len(course_topics)) * 100)
