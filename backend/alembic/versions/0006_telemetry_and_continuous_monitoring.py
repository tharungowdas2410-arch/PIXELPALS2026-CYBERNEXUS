"""Add Telemetry, Risk Change Events, Alerts, Threat Indicators, and Integration Configs.

Revision ID: 0006_telemetry_and_continuous_monitoring
Revises: 0005_ai_advisor_and_rag
Create Date: 2026-09-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0006_telemetry_and_continuous_monitoring"
down_revision: str | Sequence[str] | None = "0005_ai_advisor_and_rag"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if "security_events" not in existing_tables:
        op.create_table(
            "security_events",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("organization_id", sa.Uuid(), nullable=False),
            sa.Column("source", sa.String(length=64), nullable=False),
            sa.Column("source_event_id", sa.String(length=255), nullable=True),
            sa.Column("event_type", sa.String(length=64), nullable=False),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
            sa.Column("severity", sa.String(length=32), nullable=False, server_default="MEDIUM"),
            sa.Column("asset_id", sa.Uuid(), nullable=True),
            sa.Column("identity_id", sa.String(length=255), nullable=True),
            sa.Column("ip_address", sa.String(length=64), nullable=True),
            sa.Column("hostname", sa.String(length=255), nullable=True),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("raw_reference", sa.String(length=512), nullable=True),
            sa.Column("normalized_data", sa.JSON(), nullable=False),
            sa.Column("processed", sa.Boolean(), nullable=False, server_default="0"),
            sa.Column("is_demo", sa.Boolean(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_security_events_organization_id", "security_events", ["organization_id"])
        op.create_index("ix_security_events_source", "security_events", ["source"])
        op.create_index("ix_security_events_source_event_id", "security_events", ["source_event_id"])
        op.create_index("ix_security_events_event_type", "security_events", ["event_type"])
        op.create_index("ix_security_events_timestamp", "security_events", ["timestamp"])
        op.create_index("ix_security_events_severity", "security_events", ["severity"])
        op.create_index("ix_security_events_asset_id", "security_events", ["asset_id"])
        op.create_index("ix_security_events_identity_id", "security_events", ["identity_id"])
        op.create_index("ix_security_events_ip_address", "security_events", ["ip_address"])
        op.create_index("ix_security_events_hostname", "security_events", ["hostname"])
        op.create_index("ix_security_events_processed", "security_events", ["processed"])

    if "risk_change_events" not in existing_tables:
        op.create_table(
            "risk_change_events",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("organization_id", sa.Uuid(), nullable=False),
            sa.Column("asset_id", sa.Uuid(), nullable=True),
            sa.Column("previous_score", sa.Float(), nullable=False),
            sa.Column("new_score", sa.Float(), nullable=False),
            sa.Column("score_delta", sa.Float(), nullable=False),
            sa.Column("previous_eal", sa.Numeric(18, 2), nullable=False, server_default="0"),
            sa.Column("new_eal", sa.Numeric(18, 2), nullable=False, server_default="0"),
            sa.Column("eal_delta", sa.Numeric(18, 2), nullable=False, server_default="0"),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("source_event_id", sa.Uuid(), nullable=True),
            sa.Column("blockchain_evidence_id", sa.Uuid(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["source_event_id"], ["security_events.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_risk_change_events_organization_id", "risk_change_events", ["organization_id"])
        op.create_index("ix_risk_change_events_asset_id", "risk_change_events", ["asset_id"])
        op.create_index("ix_risk_change_events_created_at", "risk_change_events", ["created_at"])

    if "risk_alerts" not in existing_tables:
        op.create_table(
            "risk_alerts",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("organization_id", sa.Uuid(), nullable=False),
            sa.Column("severity", sa.String(length=32), nullable=False, server_default="HIGH"),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("asset_id", sa.Uuid(), nullable=True),
            sa.Column("risk_change", sa.Float(), nullable=True),
            sa.Column("financial_impact", sa.Numeric(18, 2), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="OPEN"),
            sa.Column("source_event_id", sa.Uuid(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["source_event_id"], ["security_events.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_risk_alerts_organization_id", "risk_alerts", ["organization_id"])
        op.create_index("ix_risk_alerts_severity", "risk_alerts", ["severity"])
        op.create_index("ix_risk_alerts_status", "risk_alerts", ["status"])
        op.create_index("ix_risk_alerts_asset_id", "risk_alerts", ["asset_id"])

    if "threat_indicators" not in existing_tables:
        op.create_table(
            "threat_indicators",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("organization_id", sa.Uuid(), nullable=True),
            sa.Column("indicator", sa.String(length=255), nullable=False),
            sa.Column("indicator_type", sa.String(length=32), nullable=False),
            sa.Column("confidence", sa.Float(), nullable=False, server_default="0.8"),
            sa.Column("threat_actor", sa.String(length=128), nullable=True),
            sa.Column("campaign", sa.String(length=128), nullable=True),
            sa.Column("first_seen", sa.DateTime(timezone=True), nullable=False),
            sa.Column("last_seen", sa.DateTime(timezone=True), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False, server_default="1"),
            sa.Column("source", sa.String(length=64), nullable=False, server_default="OpenCTI-Feed"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_threat_indicators_organization_id", "threat_indicators", ["organization_id"])
        op.create_index("ix_threat_indicators_indicator", "threat_indicators", ["indicator"])
        op.create_index("ix_threat_indicators_indicator_type", "threat_indicators", ["indicator_type"])
        op.create_index("ix_threat_indicators_active", "threat_indicators", ["active"])

    if "integration_configs" not in existing_tables:
        op.create_table(
            "integration_configs",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("organization_id", sa.Uuid(), nullable=False),
            sa.Column("connector_type", sa.String(length=64), nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default="1"),
            sa.Column("is_demo", sa.Boolean(), nullable=False, server_default="1"),
            sa.Column("webhook_secret_hash", sa.String(length=128), nullable=True),
            sa.Column("config_metadata", sa.JSON(), nullable=False),
            sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("health_status", sa.String(length=32), nullable=False, server_default="CONNECTED"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_integration_configs_organization_id", "integration_configs", ["organization_id"])
        op.create_index("ix_integration_configs_connector_type", "integration_configs", ["connector_type"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if "integration_configs" in existing_tables:
        op.drop_index("ix_integration_configs_connector_type", table_name="integration_configs")
        op.drop_index("ix_integration_configs_organization_id", table_name="integration_configs")
        op.drop_table("integration_configs")

    if "threat_indicators" in existing_tables:
        op.drop_index("ix_threat_indicators_active", table_name="threat_indicators")
        op.drop_index("ix_threat_indicators_indicator_type", table_name="threat_indicators")
        op.drop_index("ix_threat_indicators_indicator", table_name="threat_indicators")
        op.drop_index("ix_threat_indicators_organization_id", table_name="threat_indicators")
        op.drop_table("threat_indicators")

    if "risk_alerts" in existing_tables:
        op.drop_index("ix_risk_alerts_asset_id", table_name="risk_alerts")
        op.drop_index("ix_risk_alerts_status", table_name="risk_alerts")
        op.drop_index("ix_risk_alerts_severity", table_name="risk_alerts")
        op.drop_index("ix_risk_alerts_organization_id", table_name="risk_alerts")
        op.drop_table("risk_alerts")

    if "risk_change_events" in existing_tables:
        op.drop_index("ix_risk_change_events_created_at", table_name="risk_change_events")
        op.drop_index("ix_risk_change_events_asset_id", table_name="risk_change_events")
        op.drop_index("ix_risk_change_events_organization_id", table_name="risk_change_events")
        op.drop_table("risk_change_events")

    if "security_events" in existing_tables:
        op.drop_index("ix_security_events_processed", table_name="security_events")
        op.drop_index("ix_security_events_hostname", table_name="security_events")
        op.drop_index("ix_security_events_ip_address", table_name="security_events")
        op.drop_index("ix_security_events_identity_id", table_name="security_events")
        op.drop_index("ix_security_events_asset_id", table_name="security_events")
        op.drop_index("ix_security_events_severity", table_name="security_events")
        op.drop_index("ix_security_events_timestamp", table_name="security_events")
        op.drop_index("ix_security_events_event_type", table_name="security_events")
        op.drop_index("ix_security_events_source_event_id", table_name="security_events")
        op.drop_index("ix_security_events_source", table_name="security_events")
        op.drop_index("ix_security_events_organization_id", table_name="security_events")
        op.drop_table("security_events")
