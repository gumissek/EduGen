"""add generation compliance options

Revision ID: 005_generation_compliance_options
Revises: 004_curriculum_source_url
Create Date: 2026-03-15 02:30:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "005_generation_compliance_options"
down_revision = "004_curriculum_source_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "generations",
        sa.Column("include_compliance_card", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "generations",
        sa.Column("curriculum_document_ids", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("generations", "curriculum_document_ids")
    op.drop_column("generations", "include_compliance_card")
