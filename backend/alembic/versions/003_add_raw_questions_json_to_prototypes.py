"""Add raw_questions_json to prototypes

Revision ID: 003
Revises: 002
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "prototypes",
        sa.Column("raw_questions_json", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("prototypes", "raw_questions_json")
