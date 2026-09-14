"""Telemetry, Security Events, Alerts, and Integration Database Models."""

from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class SecurityEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Normalized security telemetry event ingested from enterprise connectors."""

    __tablename__ = "security_events"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source_event_id: Mapped[str | None] = mapped_column(String(255), index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="MEDIUM", index=True)
    asset_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    identity_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    raw_reference: Mapped[str | None] = mapped_column(String(512), nullable=True)
    normalized_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class RiskChangeEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Audit log of quantified risk change triggered by security telemetry or manual action."""

    __tablename__ = "risk_change_events"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    previous_score: Mapped[float] = mapped_column(Float, nullable=False)
    new_score: Mapped[float] = mapped_column(Float, nullable=False)
    score_delta: Mapped[float] = mapped_column(Float, nullable=False)
    previous_eal: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    new_eal: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    eal_delta: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    source_event_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("security_events.id", ondelete="SET NULL"),
        nullable=True,
    )
    blockchain_evidence_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)


class RiskAlert(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Actionable risk alert generated when telemetry indicates critical posture changes."""

    __tablename__ = "risk_alerts"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="HIGH", index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    asset_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    risk_change: Mapped[float | None] = mapped_column(Float, nullable=True)
    financial_impact: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="OPEN", nullable=False, index=True)
    source_event_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("security_events.id", ondelete="SET NULL"),
        nullable=True,
    )


class ThreatIndicator(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Threat intelligence indicator (IoC) used for correlation and telemetry matching."""

    __tablename__ = "threat_indicators"

    organization_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    indicator: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    indicator_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # IP, DOMAIN, HASH, URL
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.8)
    threat_actor: Mapped[str | None] = mapped_column(String(128), nullable=True)
    campaign: Mapped[str | None] = mapped_column(String(128), nullable=True)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="OpenCTI-Feed")


class IntegrationConfig(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Connector registration and configuration for enterprise data sources."""

    __tablename__ = "integration_configs"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connector_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # SIEM, EDR, IAM, CSPM, VULN, THREAT_INTEL
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    webhook_secret_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    config_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    health_status: Mapped[str] = mapped_column(String(32), default="CONNECTED", nullable=False)
