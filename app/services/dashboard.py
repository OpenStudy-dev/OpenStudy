from datetime import datetime, timezone

from ..schemas import DashboardSummary
from . import (
    courses as courses_svc,
    slots as slots_svc,
    klausuren as klausuren_svc,
    deliverables as deliverables_svc,
    tasks as tasks_svc,
    study_topics as topics_svc,
    lectures as lectures_svc,
    fall_behind as fb_svc,
)


def get_dashboard_summary() -> DashboardSummary:
    now = datetime.now(timezone.utc)
    cs = courses_svc.list_courses()
    ss = slots_svc.list_slots()
    ks = klausuren_svc.list_klausuren()
    ds = deliverables_svc.list_deliverables()
    ts = tasks_svc.list_tasks()
    tp = topics_svc.list_study_topics()
    ls = lectures_svc.list_lectures()
    fb = fb_svc.compute_fall_behind(cs, tp, ss, now)
    return DashboardSummary(
        now=now,
        courses=cs,
        slots=ss,
        klausuren=ks,
        deliverables=ds,
        tasks=ts,
        study_topics=tp,
        lectures=ls,
        fall_behind=fb,
    )
