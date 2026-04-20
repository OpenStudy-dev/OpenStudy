from fastapi import APIRouter, Depends

from ..auth import require_auth
from ..schemas import AppSettings, AppSettingsPatch
from ..services import settings as svc

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=AppSettings)
async def get(_: bool = Depends(require_auth)) -> AppSettings:
    return svc.get_settings()


@router.patch("", response_model=AppSettings)
async def patch(body: AppSettingsPatch, _: bool = Depends(require_auth)) -> AppSettings:
    return svc.update_settings(body)
