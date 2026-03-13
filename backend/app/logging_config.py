"""Centralized logging configuration for EduGen backend.

Call ``configure_logging()`` once at application startup (main.py / init_app.py).
All subsequent ``logging.getLogger(__name__)`` calls across the codebase will
automatically inherit the configured format and level.
"""

from __future__ import annotations

import logging
import logging.config

# ─────────────────────────────────────────────────────────────────────────────
# Format: 2024-01-15 12:30:45 [INFO    ] app.main: message text
# ─────────────────────────────────────────────────────────────────────────────
_LOG_FORMAT = "%(asctime)s [%(levelname)-8s] %(name)s: %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_LOGGING_CONFIG: dict = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": _LOG_FORMAT,
            "datefmt": _DATE_FORMAT,
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
            "stream": "ext://sys.stdout",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        # Reduce noise from third-party libraries
        "uvicorn": {"level": "INFO", "propagate": True},
        "uvicorn.access": {"level": "WARNING", "propagate": True},
        "uvicorn.error": {"level": "INFO", "propagate": True},
        "apscheduler": {"level": "WARNING", "propagate": True},
        "sqlalchemy.engine": {"level": "WARNING", "propagate": True},
        "sqlalchemy.pool": {"level": "WARNING", "propagate": True},
        "alembic": {"level": "INFO", "propagate": True},
    },
}


def configure_logging(level: int = logging.INFO) -> None:
    """Configure application-wide logging with timestamps.

    Safe to call multiple times — configuration is applied only once
    (checked via root logger handlers).

    Args:
        level: Root log level. Defaults to ``logging.INFO``.
    """
    if logging.root.handlers:
        # Already configured (e.g. uvicorn already set up logging)
        # Just ensure our format is applied by updating the root level.
        logging.root.setLevel(level)
        return

    config = dict(_LOGGING_CONFIG)
    config["root"] = {"handlers": ["console"], "level": level}
    logging.config.dictConfig(config)
