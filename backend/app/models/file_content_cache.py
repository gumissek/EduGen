"""FileContentCache model — global deduplication cache keyed by file hash."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FileContentCache(Base):
    """Stores extracted text and summary for a unique file hash.

    When the same file content (identified via SHA-256 hash) is uploaded again,
    we can reuse the previously extracted text and AI-generated summary without
    spending additional API tokens.
    """

    __tablename__ = "file_content_cache"

    file_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).isoformat(),
    )
