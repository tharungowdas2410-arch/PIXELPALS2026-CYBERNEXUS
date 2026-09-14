"""Pydantic schemas for telemetry, security operations, and continuous risk monitoring."""

from datetime import datetime
from typing import Any
from uuid import UUID
from pydantic import BaseModel, Field


class SecurityEventRead(BaseModel):
    id: UUID
    organization_id: UUID
    source: str
    source_event_id: str | None = None
    event_type: str
    timestamp: datetime
    severity: str
    asset_id: UUID | None = None
    identity_id: str | None = None
    ip_address: str | None = None
    hostname: str | None = None
    description: str
    raw_reference: str | None = None
    normalized_data: dict[str, Any] = Field(default_factory=dict)
    processed: bool
    is_demo: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskChangeEventRead(BaseModel):
    id: UUID
    organization_id: UUID
    asset_id: UUID | None = None
    previous_score: float
    new_score: float
    score_delta: float
    previous_eal: float
    new_eal: float
    eal_delta: float
    reason: str
    source_event_id: UUID | None = None
    blockchain_evidence_id: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskAlertRead(BaseModel):
    id: UUID
    organization_id: UUID
    severity: str
    title: str
    description: str
    asset_id: UUID | None = None
    risk_change: float | None = None
    financial_impact: float | None = None
    status: str
    source_event_id: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskAlertUpdate(BaseModel):
    status: str = Field(description="'OPEN', 'ACKNOWLEDGED', or 'RESOLVED'")


class ThreatIndicatorRead(BaseModel):
    id: UUID
    indicator: str
    indicator_type: str
    confidence: float
    threat_actor: str | None = None
    campaign: str | None = None
    first_seen: datetime
    last_seen: datetime
    active: bool
    source: str

    model_config = {"from_attributes": True}


class MockGenerateRequest(BaseModel):
    source: str = Field(default="SIEM", description="SIEM, EDR, IAM, CSPM, VULNERABILITY, or THREAT_INTEL")
    event_type: str | None = Field(default=None, description="Optional EventType override")
    count: int = Field(default=10, ge=1, le=100)
    target_asset_id: UUID | None = None


class ContinuousRiskSummaryResponse(BaseModel):
    current_risk: float
    previous_risk: float
    risk_delta: float
    current_financial_exposure: float
    previous_financial_exposure: float
    financial_delta: float
    risk_drift_level: str  # LOW, MODERATE, HIGH, CRITICAL
    major_drivers: list[str]
    active_alerts_count: int
    critical_alerts_count: int
    affected_assets_count: int
    top_attack_paths_count: int
    is_demo: bool = True
    notice: str = "DEMO MODE — SYNTHETIC SECURITY TELEMETRY"


class RiskDriftPoint(BaseModel):
    timestamp: str
    risk_score: float
    financial_exposure: float
    event_label: str | None = None
    severity: str | None = None


class RiskDriftResponse(BaseModel):
    points: list[RiskDriftPoint]
    summary_drift: float
    drift_trend: str
    time_window: str


class IAMRiskSignalsResponse(BaseModel):
    mfa_disabled_accounts: int
    privileged_identities_count: int
    failed_auth_spike_detected: bool
    dormant_privileged_accounts: int
    excessive_privilege_anomalies: int
    signals: list[dict[str, Any]]


class CSPMRiskSignalsResponse(BaseModel):
    public_storage_buckets: int
    open_sensitive_ports: int
    insecure_security_groups: int
    unencrypted_databases: int
    missing_audit_logging: int
    signals: list[dict[str, Any]]
