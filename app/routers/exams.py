from typing import List
from fastapi import APIRouter, Depends

from ..auth import require_auth
from ..schemas import Klausur, KlausurPatch
from ..services import klausuren as svc

router = APIRouter(prefix="/klausuren", tags=["klausuren"])


@router.get("", response_model=List[Klausur])
async def list_(_: bool = Depends(require_auth)) -> List[Klausur]:
    return svc.list_klausuren()


@router.patch("/{course_code}", response_model=Klausur)
async def patch(
    course_code: str, body: KlausurPatch, _: bool = Depends(require_auth)
) -> Klausur:
    return svc.update_klausur(course_code, body)
