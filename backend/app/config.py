"""Application configuration loaded from environment variables."""

from __future__ import annotations

import json
import secrets
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+psycopg://edugen_user:edugen_pass@localhost:5432/edugen"
    DATA_DIR: str = "./data"
    MAX_FILE_SIZE_MB: int = 10
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    # JWT configuration
    JWT_SECRET_KEY: str = secrets.token_urlsafe(64)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 30

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    @property
    def data_path(self) -> Path:
        return Path(self.DATA_DIR)

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


settings = Settings()
