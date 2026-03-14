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
import os
import sys
import time
from pathlib import Path

# Ensure the app package is importable when executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.logging_config import configure_logging  # noqa: E402

configure_logging()
logger = logging.getLogger(__name__)


def _get_positive_int_env(name: str, default: int) -> int:
    """Read a positive integer from env, falling back to default on invalid data."""
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        logger.warning("[init] Invalid %s=%r. Using default=%s.", name, raw, default)
        return default
    if value <= 0:
        logger.warning("[init] Non-positive %s=%r. Using default=%s.", name, raw, default)
        return default
    return value


def _get_positive_float_env(name: str, default: float) -> float:
    """Read a positive float from env, falling back to default on invalid data."""
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = float(raw)
    except ValueError:
        logger.warning("[init] Invalid %s=%r. Using default=%s.", name, raw, default)
        return default
    if value <= 0:
        logger.warning("[init] Non-positive %s=%r. Using default=%s.", name, raw, default)
        return default
    return value


def _get_bool_env(name: str, default: bool) -> bool:
    """Read a boolean from env, falling back to default on invalid data."""
    raw = os.getenv(name)
    if raw is None:
        return default

    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "n", "off"}:
        return False

    logger.warning("[init] Invalid %s=%r. Using default=%s.", name, raw, default)
    return default


def create_database_if_not_exists() -> None:
    """Create the database if it doesn't exist.
    
    Connects to the default 'postgres' database first, then creates
    the target database if needed.
    """
    from sqlalchemy import create_engine, text
    from sqlalchemy.engine.url import make_url
    from sqlalchemy.exc import OperationalError

    from app.config import settings

    retries = _get_positive_int_env("INIT_DB_MAX_RETRIES", 30)
    retry_delay_seconds = _get_positive_float_env("INIT_DB_RETRY_DELAY_SECONDS", 2.0)
    connect_timeout_seconds = _get_positive_int_env("INIT_DB_CONNECT_TIMEOUT_SECONDS", 5)

    db_url = settings.DATABASE_URL
    parsed_url = make_url(db_url)
    db_name = parsed_url.database
    if not db_name:
        logger.error("[database] DATABASE_URL does not contain database name: %s", db_url)
        sys.exit(1)

    admin_url = parsed_url.set(database="postgres").render_as_string(hide_password=False)
    safe_db_name = db_name.replace('"', '""')

    try:
        logger.info(
            "[database] Waiting for PostgreSQL (max retries=%s, delay=%.1fs, connect_timeout=%ss)...",
            retries,
            retry_delay_seconds,
            connect_timeout_seconds,
        )
        engine = create_engine(
            admin_url,
            isolation_level="AUTOCOMMIT",
            connect_args={"connect_timeout": connect_timeout_seconds},
        )

        for attempt in range(1, retries + 1):
            try:
                with engine.connect() as conn:
                    result = conn.execute(
                        text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                        {"db_name": db_name},
                    )
                    if not result.scalar():
                        logger.info("[database] Creating database: %s", db_name)
                        conn.execute(text(f'CREATE DATABASE "{safe_db_name}"'))
                        logger.info("[database] Database created successfully.")
                    else:
                        logger.info("[database] Database already exists: %s", db_name)
                    break
            except OperationalError as exc:
                if attempt == retries:
                    raise
                logger.warning(
                    "[database] PostgreSQL not ready (attempt %s/%s): %s. Retrying in %.1fs...",
                    attempt,
                    retries,
                    exc,
                    retry_delay_seconds,
                )
                time.sleep(retry_delay_seconds)
        engine.dispose()
    except Exception:
        logger.exception("[database] Failed to create database — aborting.")
        sys.exit(1)


def run_migrations() -> None:
    """Apply pending Alembic migrations. Exits with code 1 on failure."""
    try:
        from alembic import command
        from alembic.config import Config
        from alembic.runtime.migration import MigrationContext
        from alembic.script import ScriptDirectory
        from alembic.util.exc import CommandError
        from sqlalchemy import create_engine, inspect

        from app.config import settings

        alembic_cfg_path = Path(__file__).resolve().parent.parent / "alembic.ini"
        alembic_cfg = Config(str(alembic_cfg_path))

        connect_timeout_seconds = _get_positive_int_env("INIT_DB_CONNECT_TIMEOUT_SECONDS", 5)
        auto_stamp_unversioned = _get_bool_env("INIT_DB_AUTO_STAMP_UNVERSIONED", True)
        engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"connect_timeout": connect_timeout_seconds},
        )
        with engine.connect() as conn:
            migration_ctx = MigrationContext.configure(conn)
            current_rev = migration_ctx.get_current_revision()
            inspector = inspect(conn)
            table_names = set(inspector.get_table_names())
            user_tables = table_names - {"alembic_version"}
        engine.dispose()

        script = ScriptDirectory.from_config(alembic_cfg)
        head_rev = script.get_current_head()

        has_unknown_current_rev = False
        if current_rev is not None:
            try:
                has_unknown_current_rev = script.get_revision(current_rev) is None
            except CommandError:
                has_unknown_current_rev = True

        if has_unknown_current_rev:
            if auto_stamp_unversioned:
                logger.warning(
                    "[migrations] Detected unknown Alembic revision in DB (%s). "
                    "Stamping database to head=%s.",
                    current_rev,
                    head_rev,
                )
                command.stamp(alembic_cfg, "head", purge=True)
                logger.info("[migrations] Alembic version table stamped to head=%s.", head_rev)
                return

            logger.error(
                "[migrations] Unknown Alembic revision in DB (%s). "
                "Refusing automatic stamp because INIT_DB_AUTO_STAMP_UNVERSIONED=%s.",
                current_rev,
                auto_stamp_unversioned,
            )
            sys.exit(1)

        if current_rev is None and user_tables:
            if auto_stamp_unversioned:
                logger.warning(
                    "[migrations] Detected non-empty schema without Alembic revision (%s tables). "
                    "Stamping database to head=%s instead of re-running initial migration.",
                    len(user_tables),
                    head_rev,
                )
                command.stamp(alembic_cfg, "head", purge=True)
                logger.info("[migrations] Alembic version table stamped to head=%s.", head_rev)
                return

            logger.error(
                "[migrations] Non-empty schema detected without Alembic revision. "
                "Refusing automatic stamp because INIT_DB_AUTO_STAMP_UNVERSIONED=%s.",
                auto_stamp_unversioned,
            )
            sys.exit(1)

        if current_rev == head_rev:
            logger.info("[migrations] Database is up to date (rev: %s).", current_rev)
        else:
            logger.info(
                "[migrations] Applying migrations: %s → %s.", current_rev, head_rev
            )
            command.upgrade(alembic_cfg, "head")
            logger.info("[migrations] Migrations applied successfully.")
    except SystemExit as exc:
        exit_code = exc.code if isinstance(exc.code, int) else 1
        logger.error(
            "[migrations] Alembic terminated startup with SystemExit(code=%s) — aborting.",
            exit_code,
        )
        sys.exit(exit_code)
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
        Path(settings.DATA_DIR) / "curriculum",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
        logger.info("[dirs] Ensured: %s", d)


def main() -> None:
    logger.info("[init] Starting EduGen initialization...")
    create_database_if_not_exists()
    run_migrations()
    ensure_directories()
    logger.info("[init] Initialization complete.")


if __name__ == "__main__":
    main()
