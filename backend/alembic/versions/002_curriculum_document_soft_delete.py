"""Add is_active soft-delete flag to curriculum_documents

Revision ID: 002
Revises: 001
Create Date: 2026-03-14

Adds an is_active boolean column (default TRUE) to curriculum_documents.
When a document is "deleted" via the admin API, is_active is set to FALSE
and the physical file is removed from disk, but the record and its chunks
(including embeddings) are preserved for potential reuse when the same PDF
is uploaded again.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "curriculum_documents",
        sa.Column(
            "is_active",
            sa.Boolean,
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.create_index(
        "ix_curriculum_documents_is_active",
        "curriculum_documents",
        ["is_active"],
    )


def downgrade() -> None:
    op.drop_index("ix_curriculum_documents_is_active", table_name="curriculum_documents")
    op.drop_column("curriculum_documents", "is_active")
