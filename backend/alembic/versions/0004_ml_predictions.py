"""Persist ML predictions.

Revision ID: 0004_ml_predictions
Revises: 0003_phase2_factors
Create Date: 2026-09-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0004_ml_predictions"
down_revision: str | Sequence[str] | None = "0003_phase2_factors"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "ml_predictions" in inspector.get_table_names():
        return
    op.create_table(
        "ml_predictions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("asset_id", sa.Uuid(), nullable=True),
        sa.Column("model_name", sa.String(length=64), nullable=False),
        sa.Column("model_version", sa.String(length=32), nullable=False),
        sa.Column("prediction_type", sa.String(length=64), nullable=False),
        sa.Column("prediction_value", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("top_factors", sa.JSON(), nullable=True),
        sa.Column("feature_version", sa.String(length=16), nullable=False),
        sa.Column("extras", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ml_predictions_organization_id", "ml_predictions", ["organization_id"])
    op.create_index("ix_ml_predictions_prediction_type", "ml_predictions", ["prediction_type"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "ml_predictions" not in inspector.get_table_names():
        return
    op.drop_index("ix_ml_predictions_prediction_type", table_name="ml_predictions")
    op.drop_index("ix_ml_predictions_organization_id", table_name="ml_predictions")
    op.drop_table("ml_predictions")
