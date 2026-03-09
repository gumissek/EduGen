"""Many-to-many association table: Generation ↔ SourceFile."""

from sqlalchemy import Table, Column, String, ForeignKey

from app.database import Base

generation_source_files = Table(
    "generation_source_files",
    Base.metadata,
    Column("generation_id", String(36), ForeignKey("generations.id", ondelete="CASCADE"), primary_key=True),
    Column("source_file_id", String(36), ForeignKey("source_files.id", ondelete="CASCADE"), primary_key=True),
)
