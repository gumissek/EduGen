"""Add curriculum_year column to curriculum_documents

Revision ID: 003
Revises: 002
Create Date: 2025-07-14

Adds a curriculum_year column (nullable VARCHAR(20)) to curriculum_documents
to track the school year the curriculum document applies to (e.g. "2025/2026").
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "curriculum_documents",
        sa.Column("curriculum_year", sa.String(20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("curriculum_documents", "curriculum_year")
