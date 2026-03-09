"""Add file hash cache

Revision ID: 004
Revises: 003
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New global cache table keyed by SHA-256 file hash
    op.create_table(
        "file_content_cache",
        sa.Column("file_hash", sa.String(64), primary_key=True),
        sa.Column("file_type", sa.String(20), nullable=False),
        sa.Column("extracted_text", sa.Text, nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("page_count", sa.Integer, nullable=True),
        sa.Column("created_at", sa.String, nullable=False),
    )

    # Add file_hash column to source_files for back-reference
    op.add_column(
        "source_files",
        sa.Column("file_hash", sa.String(64), nullable=True, index=True),
    )
    op.create_index("ix_source_files_file_hash", "source_files", ["file_hash"])


def downgrade() -> None:
    op.drop_index("ix_source_files_file_hash", table_name="source_files")
    op.drop_column("source_files", "file_hash")
    op.drop_table("file_content_cache")
