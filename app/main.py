from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .mcp_http import build_mcp_http_app
from .routers import (
    auth as auth_router,
    dashboard as dashboard_router,
    courses as courses_router,
    slots as slots_router,
    exams as exams_router,
    study_topics as study_topics_router,
    deliverables as deliverables_router,
    tasks as tasks_router,
    events as events_router,
    lectures as lectures_router,
    oauth as oauth_router,
    files as files_router,
    settings as settings_router,
)


def create_app() -> FastAPI:
    settings = get_settings()

    # _AutoStartMcpApp enters the session manager's lifespan on first request
    # and keeps it open — Vercel's Python runtime doesn't fire ASGI lifespan,
    # so we can't rely on chaining it into FastAPI's lifespan in prod.
    mcp_app = build_mcp_http_app()

    app = FastAPI(
        title="OpenStudy API",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health
    @app.get("/api/health")
    async def health() -> JSONResponse:
        return JSONResponse({"ok": True})

    # Mount routers under /api
    for r in [
        auth_router.router,
        dashboard_router.router,
        courses_router.router,
        slots_router.router,
        exams_router.router,
        study_topics_router.router,
        deliverables_router.router,
        tasks_router.router,
        events_router.router,
        lectures_router.router,
        files_router.router,
        settings_router.router,
    ]:
        app.include_router(r, prefix="/api")

    # OAuth AS + well-known discovery live at the root (not /api/*) because
    # Claude.ai spec requires /.well-known/* at the resource server origin.
    app.include_router(oauth_router.router)

    # MCP Streamable HTTP endpoint at /mcp (auth-gated by the OAuth Bearer token).
    app.mount("/mcp", mcp_app)

    return app


app = create_app()
