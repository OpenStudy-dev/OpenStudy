from typing import List, Optional
from fastapi import APIRouter, Depends, Response, status

from ..auth import require_auth
from ..schemas import Lecture, LectureCreate, LecturePatch
from ..services import lectures as svc

router = APIRouter(prefix="/lectures", tags=["lectures"])


@router.get("", response_model=List[Lecture])
async def list_(
    course_code: Optional[str] = None, _: bool = Depends(require_auth)
) -> List[Lecture]:
    return await svc.list_lectures(course_code=course_code)


@router.post("", response_model=Lecture, status_code=status.HTTP_201_CREATED)
async def create(body: LectureCreate, _: bool = Depends(require_auth)) -> Lecture:
    return await svc.create_lecture(body)


@router.patch("/{lecture_id}", response_model=Lecture)
async def patch(
    lecture_id: str, body: LecturePatch, _: bool = Depends(require_auth)
) -> Lecture:
    return await svc.update_lecture(lecture_id, body)


@router.post("/{lecture_id}/attended", response_model=Lecture)
async def attended(
    lecture_id: str, attended: bool = True, _: bool = Depends(require_auth)
) -> Lecture:
    return await svc.mark_attended(lecture_id, attended=attended)


@router.delete(
    "/{lecture_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response
)
async def delete(lecture_id: str, _: bool = Depends(require_auth)) -> Response:
    await svc.delete_lecture(lecture_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
