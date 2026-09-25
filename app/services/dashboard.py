from datetime import datetime, timezone
from uuid import UUID

from ..schemas import DashboardSummary
from . import (
    courses as courses_svc,
    slots as slots_svc,
    exams as exams_svc,
    deliverables as deliverables_svc,
    tasks as tasks_svc,
    study_topics as topics_svc,
    lectures as lectures_svc,
    fall_behind as fb_svc,
)


async def get_dashboard_summary(
    user_id: UUID, include_archived: bool = False
) -> DashboardSummary:
    """Everything the dashboard renders in one call.

    Archived courses (finished semesters) are left out by default, together
    with every row linked to them; tasks without a course always stay.
    `include_archived=True` returns everything, for pages that must still
    open an archived course. Fall-behind warnings never cover archived
    courses either way.
    """
    now = datetime.now(timezone.utc)
    cs = await courses_svc.list_courses(user_id)
    ss = await slots_svc.list_slots(user_id)
    es = await exams_svc.list_exams(user_id)
    ds = await deliverables_svc.list_deliverables(user_id)
    ts = await tasks_svc.list_tasks(user_id)
    tp = await topics_svc.list_study_topics(user_id)
    ls = await lectures_svc.list_lectures(user_id)

    archived = {c.code for c in cs if c.archived}
    active = [c for c in cs if not c.archived]

    def live(rows):
        return [r for r in rows if r.course_code not in archived]

    fb = fb_svc.compute_fall_behind(active, live(tp), live(ss), now)
    if not include_archived:
        cs, ss, es, ds, ts, tp, ls = (
            active, live(ss), live(es), live(ds), live(ts), live(tp), live(ls),
        )
    return DashboardSummary(
        now=now,
        courses=cs,
        slots=ss,
        exams=es,
        deliverables=ds,
        tasks=ts,
        study_topics=tp,
        lectures=ls,
        fall_behind=fb,
    )
