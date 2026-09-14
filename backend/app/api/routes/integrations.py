"""API endpoints for Integrations, Telemetry Ingestion, Continuous Risk, and Alerts."""

import os
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.integrations.event_processor import EventProcessor
from app.integrations.normalization import ConnectorType, EventSeverity, EventType, NormalizedSecurityEvent
from app.integrations.registry import connector_registry
from app.integrations.webhook import validate_webhook_request
from app.models.asset import Asset
from app.models.enums import RemediationStatus, UserRole
from app.models.financial_risk import FinancialRisk
from app.models.risk import Risk
from app.models.telemetry import (
    IntegrationConfig,
    RiskAlert,
    RiskChangeEvent,
    SecurityEvent,
    ThreatIndicator,
)
from app.models.vulnerability import Vulnerability
from app.schemas.common import DataResponse, PaginatedResponse
from app.schemas.telemetry import (
    CSPMRiskSignalsResponse,
    ContinuousRiskSummaryResponse,
    IAMRiskSignalsResponse,
    MockGenerateRequest,
    RiskAlertRead,
    RiskAlertUpdate,
    RiskChangeEventRead,
    RiskDriftPoint,
    RiskDriftResponse,
    SecurityEventRead,
    ThreatIndicatorRead,
)
from app.services.blockchain_service import record_evidence
from app.services.query import paginate

router = APIRouter(tags=["integrations-and-continuous-risk"])


# ============================================================================ #
# 1. Webhook Ingestion
# ============================================================================ #


@router.post("/integrations/webhook/{connector}")
async def receive_webhook(
    connector: str,
    request: Request,
    session: DbSession,
    org_id: UUID = Query(..., description="Organization ID to scope the incoming telemetry"),
) -> dict[str, Any]:
    """Ingest enterprise telemetry via webhook from SIEM, EDR, IAM, CSPM, or Vuln scanners.

    Validates payload integrity, optional HMAC signature, replay protection, and timestamp drift.
    """
    conn = connector_registry.get(connector)
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connector '{connector}' is not registered or supported",
        )

    # Optional webhook secret check if configured in DB or env
    webhook_secret = os.getenv(f"{connector.upper()}_WEBHOOK_SECRET")
    body_bytes, json_data = await validate_webhook_request(request, secret=webhook_secret)

    # Normalize incoming event using connector
    try:
        normalized = conn.normalize_event(json_data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to normalize payload from {conn.get_name()}: {exc}",
        )

    processor = EventProcessor(session, organization_id=org_id)
    result = await processor.process_normalized_event(normalized)
    return result


# ============================================================================ #
# 2. Mock Telemetry Generator
# ============================================================================ #


@router.post("/integrations/mock/generate", response_model=DataResponse[dict[str, Any]])
async def generate_mock_telemetry(
    payload: MockGenerateRequest,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict[str, Any]]:
    """Generate realistic synthetic security telemetry for SIH demonstration.

    Clearly flags all generated data as synthetic demo telemetry.
    """
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST)(user)
    conn_key = payload.source.lower().replace("-", "_")
    conn = connector_registry.get(conn_key)
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported mock connector source: {payload.source}",
        )

    events = conn.fetch_events(limit=payload.count)
    processor = EventProcessor(session, organization_id=user.organization_id)
    processed_results = []

    for evt in events:
        if payload.event_type:
            try:
                evt.event_type = EventType(payload.event_type)
            except ValueError:
                pass
        if payload.target_asset_id:
            evt.asset_id = payload.target_asset_id

        res = await processor.process_normalized_event(evt)
        processed_results.append(res)

    return DataResponse(
        data={
            "notice": "DEMO MODE — SYNTHETIC SECURITY TELEMETRY",
            "source": conn.get_name(),
            "generated_count": len(processed_results),
            "events": processed_results,
        }
    )


# ============================================================================ #
# 3. Telemetry Event Stream & Timeline
# ============================================================================ #


@router.get("/integrations/events", response_model=PaginatedResponse[SecurityEventRead])
async def list_security_events(
    user: CurrentUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    source: str | None = None,
    event_type: str | None = None,
    severity: str | None = None,
    asset_id: UUID | None = None,
) -> PaginatedResponse[SecurityEventRead]:
    """Query normalized telemetry events with filters and pagination."""
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.SECURITY_ANALYST,
        UserRole.RISK_MANAGER,
    )(user)
    query = (
        select(SecurityEvent)
        .where(SecurityEvent.organization_id == user.organization_id)
        .order_by(SecurityEvent.timestamp.desc())
    )
    if source:
        query = query.where(SecurityEvent.source.ilike(f"%{source}%"))
    if event_type:
        query = query.where(SecurityEvent.event_type == event_type)
    if severity:
        query = query.where(SecurityEvent.severity == severity)
    if asset_id:
        query = query.where(SecurityEvent.asset_id == asset_id)

    rows, total = await paginate(session, query, page, page_size)
    return PaginatedResponse(
        data=[SecurityEventRead.model_validate(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


# ============================================================================ #
# 4. Integration Health
# ============================================================================ #


@router.get("/integrations/health")
async def get_integrations_health(
    user: CurrentUser,
    session: DbSession,
) -> dict[str, Any]:
    """Retrieve integration connectivity health cards for all enterprise sources."""
    status_map = connector_registry.get_health_status()
    return {
        "status": "ok",
        "connectors": status_map,
        "is_demo": True,
        "notice": "DEMO MODE — SYNTHETIC SECURITY TELEMETRY",
    }


# ============================================================================ #
# 5. IAM & CSPM Risk Signals
# ============================================================================ #


@router.get("/integrations/iam/risk-signals", response_model=DataResponse[IAMRiskSignalsResponse])
async def get_iam_risk_signals(
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[IAMRiskSignalsResponse]:
    """Expose identity posture metrics and risk signals from IAM telemetry."""
    stmt = (
        select(SecurityEvent)
        .where(
            SecurityEvent.organization_id == user.organization_id,
            SecurityEvent.event_type.in_([
                EventType.MFA_DISABLED.value,
                EventType.PRIVILEGED_LOGIN.value,
                EventType.AUTH_FAILURE.value,
            ]),
        )
        .order_by(SecurityEvent.timestamp.desc())
        .limit(20)
    )
    events = list((await session.scalars(stmt)).all())

    mfa_disabled = sum(1 for e in events if e.event_type == EventType.MFA_DISABLED.value)
    privileged = sum(1 for e in events if e.event_type == EventType.PRIVILEGED_LOGIN.value)
    auth_fails = sum(1 for e in events if e.event_type == EventType.AUTH_FAILURE.value)

    return DataResponse(
        data=IAMRiskSignalsResponse(
            mfa_disabled_accounts=mfa_disabled,
            privileged_identities_count=max(2, privileged),
            failed_auth_spike_detected=auth_fails >= 5,
            dormant_privileged_accounts=1 if mfa_disabled > 0 else 0,
            excessive_privilege_anomalies=privileged,
            signals=[
                {
                    "event_id": str(e.id),
                    "type": e.event_type,
                    "identity": e.identity_id,
                    "timestamp": e.timestamp.isoformat(),
                    "description": e.description,
                    "severity": e.severity,
                }
                for e in events[:10]
            ],
        )
    )


@router.get("/integrations/cspm/risk-signals", response_model=DataResponse[CSPMRiskSignalsResponse])
async def get_cspm_risk_signals(
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[CSPMRiskSignalsResponse]:
    """Expose cloud configuration posture metrics and risk signals from CSPM telemetry."""
    stmt = (
        select(SecurityEvent)
        .where(
            SecurityEvent.organization_id == user.organization_id,
            SecurityEvent.event_type.in_([
                EventType.CLOUD_MISCONFIGURATION.value,
                EventType.DATA_EXPOSURE.value,
                EventType.POLICY_VIOLATION.value,
            ]),
        )
        .order_by(SecurityEvent.timestamp.desc())
        .limit(20)
    )
    events = list((await session.scalars(stmt)).all())

    public_storage = sum(1 for e in events if e.event_type == EventType.DATA_EXPOSURE.value)
    open_ports = sum(1 for e in events if "PORT" in e.description.upper() or "SECURITY GROUP" in e.description.upper())

    return DataResponse(
        data=CSPMRiskSignalsResponse(
            public_storage_buckets=public_storage,
            open_sensitive_ports=open_ports,
            insecure_security_groups=max(1, open_ports),
            unencrypted_databases=1,
            missing_audit_logging=1,
            signals=[
                {
                    "event_id": str(e.id),
                    "type": e.event_type,
                    "resource": e.hostname or e.raw_reference,
                    "timestamp": e.timestamp.isoformat(),
                    "description": e.description,
                    "severity": e.severity,
                }
                for e in events[:10]
            ],
        )
    )


# ============================================================================ #
# 6. Continuous Risk Summary & Drift
# ============================================================================ #


@router.get("/continuous-risk/summary", response_model=DataResponse[ContinuousRiskSummaryResponse])
async def get_continuous_risk_summary(
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[ContinuousRiskSummaryResponse]:
    """Header KPI metrics showing continuous quantified risk and financial shifts."""
    # Query current risks
    stmt = select(Risk).where(Risk.organization_id == user.organization_id)
    risks = list((await session.scalars(stmt)).all())

    current_risk = round(sum(r.residual_risk for r in risks) / len(risks), 1) if risks else 72.0
    current_fin = sum(float(r.financial_exposure) for r in risks) if risks else 48_200_000.0

    # Query recent risk change events
    rc_stmt = (
        select(RiskChangeEvent)
        .where(RiskChangeEvent.organization_id == user.organization_id)
        .order_by(RiskChangeEvent.created_at.desc())
        .limit(10)
    )
    changes = list((await session.scalars(rc_stmt)).all())

    if changes:
        first_c = changes[0]
        previous_risk = round(first_c.previous_score, 1)
        risk_delta = round(current_risk - previous_risk, 1)
        previous_fin = float(first_c.previous_eal) * 10.0 if first_c.previous_eal else current_fin * 0.9
        financial_delta = round(current_fin - previous_fin, 2)
    else:
        previous_risk = 68.0
        risk_delta = round(current_risk - previous_risk, 1)
        previous_fin = 42_700_000.0
        financial_delta = round(current_fin - previous_fin, 2)

    drift_level = "LOW"
    if risk_delta >= 10.0:
        drift_level = "CRITICAL"
    elif risk_delta >= 5.0:
        drift_level = "HIGH"
    elif risk_delta >= 2.0:
        drift_level = "MODERATE"

    # Query active alerts
    alert_stmt = select(RiskAlert).where(
        RiskAlert.organization_id == user.organization_id,
        RiskAlert.status == "OPEN",
    )
    alerts = list((await session.scalars(alert_stmt)).all())
    crit_alerts = sum(1 for a in alerts if a.severity == "CRITICAL")

    # Major drivers
    drivers = []
    for r in risks:
        if r.drivers:
            drivers.extend(r.drivers)
    top_drivers = list(dict.fromkeys(drivers))[:5] or [
        "External Internet Exposure",
        "Privileged Access Without MFA",
        "Critical Vulnerability in Payment Service",
    ]

    return DataResponse(
        data=ContinuousRiskSummaryResponse(
            current_risk=current_risk,
            previous_risk=previous_risk,
            risk_delta=risk_delta,
            current_financial_exposure=current_fin,
            previous_financial_exposure=previous_fin,
            financial_delta=financial_delta,
            risk_drift_level=drift_level,
            major_drivers=top_drivers,
            active_alerts_count=len(alerts),
            critical_alerts_count=crit_alerts,
            affected_assets_count=len(risks),
            top_attack_paths_count=4,
            is_demo=True,
        )
    )


@router.get("/continuous-risk/drift", response_model=DataResponse[RiskDriftResponse])
async def get_continuous_risk_drift(
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[RiskDriftResponse]:
    """Time-series chart data for Recharts showing risk score and financial exposure over time."""
    stmt = (
        select(RiskChangeEvent)
        .where(RiskChangeEvent.organization_id == user.organization_id)
        .order_by(RiskChangeEvent.created_at.asc())
        .limit(30)
    )
    changes = list((await session.scalars(stmt)).all())

    points: list[RiskDriftPoint] = []
    if changes:
        for c in changes:
            points.append(
                RiskDriftPoint(
                    timestamp=c.created_at.strftime("%H:%M"),
                    risk_score=round(c.new_score, 1),
                    financial_exposure=float(c.new_eal) * 5.0,
                    event_label=c.reason[:40] + ("..." if len(c.reason) > 40 else ""),
                    severity="HIGH" if c.score_delta > 5 else "MEDIUM",
                )
            )
    else:
        # Fallback realistic baseline drift sequence
        base_time = datetime.now(timezone.utc) - timedelta(hours=2)
        sim_data = [
            (0, 68.0, 42_000_000, "Baseline posture check", "LOW"),
            (20, 69.5, 43_500_000, "Failed login burst on VPN", "MEDIUM"),
            (45, 74.0, 47_000_000, "MFA disabled on admin account", "HIGH"),
            (70, 81.0, 53_700_000, "Critical CVE-2024-3400 detected", "CRITICAL"),
            (90, 84.0, 56_200_000, "Active threat intelligence match", "CRITICAL"),
        ]
        for m, score, fin, label, sev in sim_data:
            t = base_time + timedelta(minutes=m)
            points.append(
                RiskDriftPoint(
                    timestamp=t.strftime("%H:%M"),
                    risk_score=score,
                    financial_exposure=fin,
                    event_label=label,
                    severity=sev,
                )
            )

    net_drift = round(points[-1].risk_score - points[0].risk_score, 1) if len(points) >= 2 else 0.0

    return DataResponse(
        data=RiskDriftResponse(
            points=points,
            summary_drift=net_drift,
            drift_trend="INCREASING" if net_drift > 0 else "STABLE",
            time_window="Last 2 Hours",
        )
    )


# ============================================================================ #
# 7. Risk Alerts Management
# ============================================================================ #


@router.get("/alerts", response_model=PaginatedResponse[RiskAlertRead])
async def list_alerts(
    user: CurrentUser,
    session: DbSession,
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[RiskAlertRead]:
    """Retrieve actionable risk alerts with optional status filtering."""
    query = (
        select(RiskAlert)
        .where(RiskAlert.organization_id == user.organization_id)
        .order_by(RiskAlert.created_at.desc())
    )
    if status_filter:
        query = query.where(RiskAlert.status == status_filter.upper())

    rows, total = await paginate(session, query, page, page_size)
    return PaginatedResponse(
        data=[RiskAlertRead.model_validate(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/alerts/{alert_id}", response_model=DataResponse[RiskAlertRead])
async def update_alert_status(
    alert_id: UUID,
    payload: RiskAlertUpdate,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[RiskAlertRead]:
    """Acknowledge or resolve an active risk alert."""
    alert = await session.get(RiskAlert, alert_id)
    if not alert or alert.organization_id != user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.status = payload.status.upper()
    await session.commit()
    await session.refresh(alert)
    return DataResponse(data=RiskAlertRead.model_validate(alert))


# ============================================================================ #
# 8. Blockchain Notarization for Risk Changes
# ============================================================================ #


@router.post("/continuous-risk/{change_id}/notarize", response_model=DataResponse[dict[str, Any]])
async def notarize_risk_change(
    change_id: UUID,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict[str, Any]]:
    """Notarize a material continuous risk change event onto the tamper-evident blockchain ledger."""
    rc = await session.get(RiskChangeEvent, change_id)
    if not rc or rc.organization_id != user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk change event not found")

    payload = (
        f"MaterialRiskChange: id={rc.id}, prev={rc.previous_score}, new={rc.new_score}, "
        f"delta={rc.score_delta}, eal_delta={rc.eal_delta}, reason='{rc.reason}', "
        f"timestamp={rc.created_at.isoformat()}"
    )
    evidence = await record_evidence(
        session,
        organization_id=user.organization_id,
        evidence_type="CONTINUOUS_RISK_CHANGE",
        entity_id=rc.id,
        payload=payload,
    )
    rc.blockchain_evidence_id = evidence.id
    await session.commit()

    return DataResponse(
        data={
            "risk_change_id": str(rc.id),
            "blockchain_evidence_id": str(evidence.id),
            "evidence_hash": evidence.evidence_hash,
            "transaction_hash": evidence.transaction_hash,
            "status": "RECORDED",
        }
    )
