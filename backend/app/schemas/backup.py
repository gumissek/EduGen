"""Backup schemas."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel


class BackupResponse(BaseModel):
    id: str
    backup_path: str
    size_bytes: int
    created_at: str
    expires_at: str

    class Config:
        from_attributes = True


class BackupListResponse(BaseModel):
    backups: List[BackupResponse]
