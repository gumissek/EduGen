"""FastAPI application — lifespan, middleware, router registration."""

from __future__ import annotations

import json
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import SessionLocal
from app.models import *  # noqa: F401, F403 — register all models


def _ensure_directories():
    """Create required data directories."""
    dirs = [
        Path(settings.DATA_DIR),
        Path(settings.DATA_DIR) / "subjects",
        Path(settings.DATA_DIR) / "documents",
        Path(settings.DATA_DIR) / "backups",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


def _seed_database():
    """Seed default user if it doesn't exist."""
    db = SessionLocal()
    try:
        from app.models.user import User

        # Seed default user
        user = db.query(User).first()
        if not user:
            from app.services.auth_service import hash_password
            user = User(
                password_hash=hash_password("Start1234!"),
                must_change_password=True,
            )
            db.add(user)
            db.commit()
    finally:
        db.close()


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


def _run_migrations():
    """Ensure the DB schema is up to date.

    Uses SQLAlchemy create_all (idempotent) for the base tables, then
    applies any missing columns manually.  This avoids Alembic multi-worker
    race conditions on SQLite while still being safe to run in every worker.
    """
    from sqlalchemy import inspect, text
    from app.database import Base, engine

    # create_all creates missing tables; wrapped in try/except to handle
    # the rare race condition when two uvicorn workers start simultaneously.
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass  # Another worker already created the tables — safe to ignore

    # --- migration 002: add must_change_password if missing ---
    with engine.connect() as conn:
        inspector = inspect(engine)
        if inspector.has_table("users"):
            columns = [c["name"] for c in inspector.get_columns("users")]
            if "must_change_password" not in columns:
                try:
                    conn.execute(
                        text("ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1")
                    )
                    conn.commit()
                except Exception:
                    # Another worker already added the column — safe to ignore
                    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # Startup
    _ensure_directories()

    # Run DB migrations (creates tables + applies any new columns)
    _run_migrations()

    # Seed data
    _seed_database()

    # Start backup scheduler
    scheduler = _start_backup_scheduler()

    yield

    # Shutdown
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="EduGen Local API",
    description="Backend API for educational content generation",
    version="0.1.0",
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
from app.routers import auth, settings as settings_router, subjects, files, generations, prototypes, documents, backups, diagnostics, levels, task_types  # noqa: E402

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
