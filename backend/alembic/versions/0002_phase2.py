"""Add attack paths, scenario runs, and risk drivers.

Revision ID: 0002_phase2
Revises: 0001_initial
Create Date: 2026-09-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

from app.models.attack_path import AttackPath
from app.models.scenario import ScenarioRun

revision: str = "0002_phase2"
down_revision: str | Sequence[str] | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()
    if "attack_paths" not in tables:
        AttackPath.__table__.create(bind)
    if "scenario_runs" not in tables:
        ScenarioRun.__table__.create(bind)
    risk_cols = {col["name"] for col in inspector.get_columns("risks")}
    if "drivers" not in risk_cols:
        op.add_column("risks", sa.Column("drivers", sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "drivers" in {col["name"] for col in inspector.get_columns("risks")}:
        op.drop_column("risks", "drivers")
    if "scenario_runs" in inspector.get_table_names():
        ScenarioRun.__table__.drop(bind)
    if "attack_paths" in inspector.get_table_names():
        AttackPath.__table__.drop(bind)
