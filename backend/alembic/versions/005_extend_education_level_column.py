"""Extend education_level column to support custom values

Revision ID: 005
Revises: 004
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extend education_level column from String(20) to String(255)
    # to accommodate custom/user-defined education level names.
    # SQLite ALTER COLUMN is limited, so we recreate the column via a batch operation.
    with op.batch_alter_table("generations") as batch_op:
        batch_op.alter_column(
            "education_level",
            type_=sa.String(255),
            existing_nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("generations") as batch_op:
        batch_op.alter_column(
            "education_level",
            type_=sa.String(20),
            existing_nullable=False,
        )
