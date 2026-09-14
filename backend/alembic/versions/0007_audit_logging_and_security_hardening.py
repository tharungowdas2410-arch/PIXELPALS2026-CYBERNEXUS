"""Add Centralized Audit Logging and Security Hardening Indexes.

Revision ID: 0007_audit_logging_and_security_hardening
Revises: 0006_telemetry_and_continuous_monitoring
Create Date: 2026-09-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0007_audit_logging_and_security_hardening"
down_revision: str | Sequence[str] | None = "0006_telemetry_and_continuous_monitoring"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if "audit_logs" not in existing_tables:
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("organization_id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=True),
            sa.Column("action", sa.String(length=100), nullable=False),
            sa.Column("entity_type", sa.String(length=64), nullable=False),
            sa.Column("entity_id", sa.String(length=128), nullable=True),
            sa.Column("result", sa.String(length=32), nullable=False, server_default="SUCCESS"),
            sa.Column("ip_address", sa.String(length=64), nullable=True),
            sa.Column("user_agent", sa.String(length=255), nullable=True),
            sa.Column("correlation_id", sa.String(length=64), nullable=True),
            sa.Column("details", sa.JSON(), nullable=False),
            sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_audit_logs_organization_id", "audit_logs", ["organization_id"])
        op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
        op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
        op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
        op.create_index("ix_audit_logs_result", "audit_logs", ["result"])
        op.create_index("ix_audit_logs_correlation_id", "audit_logs", ["correlation_id"])
        op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])
        op.create_index("ix_audit_org_timestamp", "audit_logs", ["organization_id", "timestamp"])
        op.create_index("ix_audit_org_action", "audit_logs", ["organization_id", "action"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if "audit_logs" in existing_tables:
        op.drop_table("audit_logs")
