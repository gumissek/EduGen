"""Initialization script — runs once as a single process before the server starts.

Responsibilities:
  - Apply pending Alembic database migrations
  - Create required data directories

Because this script runs before uvicorn spawns any workers, there is no
concurrency risk and no advisory lock is needed.
On migration failure the script exits with code 1 so the container restarts.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Ensure the app package is importable when executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def run_migrations() -> None:
    """Apply pending Alembic migrations. Exits with code 1 on failure."""
    try:
        from alembic import command
        from alembic.config import Config
        from alembic.runtime.migration import MigrationContext
        from alembic.script import ScriptDirectory
        from sqlalchemy import create_engine

        from app.config import settings

        alembic_cfg_path = Path(__file__).resolve().parent.parent / "alembic.ini"
        alembic_cfg = Config(str(alembic_cfg_path))

        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            migration_ctx = MigrationContext.configure(conn)
            current_rev = migration_ctx.get_current_revision()

        script = ScriptDirectory.from_config(alembic_cfg)
        head_rev = script.get_current_head()

        if current_rev == head_rev:
            logger.info("[migrations] Database is up to date (rev: %s).", current_rev)
        else:
            logger.info(
                "[migrations] Applying migrations: %s → %s.", current_rev, head_rev
            )
            command.upgrade(alembic_cfg, "head")
            logger.info("[migrations] Migrations applied successfully.")
    except Exception:
        logger.exception("[migrations] Failed to apply migrations — aborting.")
        sys.exit(1)


def ensure_directories() -> None:
    """Create required data directories if they don't exist."""
    from app.config import settings

    dirs = [
        Path(settings.DATA_DIR),
        Path(settings.DATA_DIR) / "subjects",
        Path(settings.DATA_DIR) / "documents",
        Path(settings.DATA_DIR) / "backups",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
        logger.info("[dirs] Ensured: %s", d)


def main() -> None:
    logger.info("[init] Starting EduGen initialization...")
    run_migrations()
    ensure_directories()
    logger.info("[init] Initialization complete.")


if __name__ == "__main__":
    main()
