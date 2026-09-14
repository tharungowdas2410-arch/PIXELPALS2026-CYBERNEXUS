"""Add explainable risk factors and formula trace.

Revision ID: 0003_phase2_factors
Revises: 0002_phase2
Create Date: 2026-09-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0003_phase2_factors"
down_revision: str | Sequence[str] | None = "0002_phase2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "risks" not in inspector.get_table_names():
        return
    cols = {col["name"] for col in inspector.get_columns("risks")}
    if "factors" not in cols:
        op.add_column("risks", sa.Column("factors", sa.JSON(), nullable=True))
    if "formula_trace" not in cols:
        op.add_column("risks", sa.Column("formula_trace", sa.String(length=1024), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "risks" not in inspector.get_table_names():
        return
    cols = {col["name"] for col in inspector.get_columns("risks")}
    if "formula_trace" in cols:
        op.drop_column("risks", "formula_trace")
    if "factors" in cols:
        op.drop_column("risks", "factors")
