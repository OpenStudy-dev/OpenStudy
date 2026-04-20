from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from ..auth import clear_session, issue_session, optional_auth, verify_password
from ..ratelimit import check_login_rate, record_login_attempt
from ..schemas import LoginRequest, SessionInfo

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=SessionInfo)
async def login(body: LoginRequest, request: Request, response: Response) -> SessionInfo:
    await check_login_rate(request)
    ok = verify_password(body.password)
    await record_login_attempt(request, ok)
    if not ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid password")
    issue_session(response)
    return SessionInfo(authed=True)


@router.post("/logout", response_model=SessionInfo)
async def logout(response: Response) -> SessionInfo:
    clear_session(response)
    return SessionInfo(authed=False)


@router.get("/session", response_model=SessionInfo)
async def session(authed: bool = Depends(optional_auth)) -> SessionInfo:
    return SessionInfo(authed=authed)
