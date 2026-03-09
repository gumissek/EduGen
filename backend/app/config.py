"""Application configuration loaded from environment variables."""

from __future__ import annotations

import json
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "sqlite:///./data/edugen.db"
    DEFAULT_PASSWORD_HASH: str = ""
    DATA_DIR: str = "./data"
    SESSION_TIMEOUT_MINUTES: int = 15
    MAX_FILE_SIZE_MB: int = 10
    CORS_ORIGINS: str = '["http://localhost:3000"]'

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
