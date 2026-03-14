"""FastAPI application — lifespan, middleware, router registration."""

from __future__ import annotations

import json
import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import SessionLocal
from app.logging_config import configure_logging
from app.models import *  # noqa: F401, F403 — register all models

configure_logging()
logger = logging.getLogger(__name__)


def _start_backup_scheduler():
    """Start APScheduler for periodic backups."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.services.backup_service import create_backup, cleanup_old_backups

        def _backup_job():
            db = SessionLocal()
            try:
                create_backup(db)
                cleanup_old_backups(db)
            except Exception:
                pass
            finally:
                db.close()

        scheduler = BackgroundScheduler()
        scheduler.add_job(_backup_job, "interval", hours=24, id="daily_backup")
        scheduler.start()
        return scheduler
    except Exception:
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # Startup — migrations and directories are handled by app/init_app.py
    # which runs as a separate process before uvicorn is started.
    scheduler = _start_backup_scheduler()

    yield

    # Shutdown
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="EduGen API",
    description="Backend API for educational content generation",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler — logs to diagnostic_logs
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions, log them, and return 500."""
    db = SessionLocal()
    try:
        from app.models.diagnostic_log import DiagnosticLog

        log = DiagnosticLog(
            level="ERROR",
            message=f"Unhandled exception: {str(exc)}",
            metadata_json=json.dumps({
                "path": str(request.url),
                "method": request.method,
                "traceback": traceback.format_exc(),
            }),
        )
        db.add(log)
        db.commit()
    except Exception:
        pass
    finally:
        db.close()

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Health check
@app.get("/api/health", tags=["health"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


# Register routers
from app.routers import auth, settings as settings_router, subjects, files, generations, prototypes, documents, backups, diagnostics, levels, task_types, secret_keys, user_ai_models as user_ai_models_router, admin, curriculum  # noqa: E402

app.include_router(auth.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(generations.router, prefix="/api")
app.include_router(prototypes.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(backups.router, prefix="/api")
app.include_router(diagnostics.router, prefix="/api")
app.include_router(levels.router, prefix="/api")
app.include_router(task_types.router, prefix="/api")
app.include_router(secret_keys.router, prefix="/api")
app.include_router(user_ai_models_router.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(curriculum.router, prefix="/api")
