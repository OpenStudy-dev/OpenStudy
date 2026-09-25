from fastapi import APIRouter, Depends, Query

from ..auth import require_user, User
from ..schemas import DashboardSummary
from ..intents import dashboard as intent

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardSummary)
async def dashboard(
    include_archived: bool = Query(False),
    user: User = Depends(require_user),
) -> DashboardSummary:
    return await intent.get_dashboard_summary(user.id, include_archived=include_archived)
