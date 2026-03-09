"""File schemas."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class FileResponse(BaseModel):
    id: str
    subject_id: str
    filename: str
    file_type: str
    file_size: int
    summary: Optional[str] = None
    page_count: Optional[int] = None
    created_at: str
    has_extracted_text: bool = False
    extraction_error: Optional[str] = None

    class Config:
        from_attributes = True


class FileListResponse(BaseModel):
    files: list[FileResponse]
    total: int
