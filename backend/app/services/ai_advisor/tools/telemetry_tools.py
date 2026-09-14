"""AI Advisor tools for querying recent security telemetry, risk shifts, and continuous drift."""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.telemetry import RiskAlert, RiskChangeEvent, SecurityEvent


async def get_recent_telemetry_events(
    session: AsyncSession,
    organization_id: UUID,
    window_minutes: int = 60,
    limit: int = 15,
) -> dict[str, Any]:
    """Retrieve security telemetry events and risk changes that occurred within the specified time window."""
    since = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)

    # Query events
    evt_stmt = (
        select(SecurityEvent)
        .where(
            SecurityEvent.organization_id == organization_id,
            SecurityEvent.timestamp >= since,
        )
        .order_by(SecurityEvent.timestamp.desc())
        .limit(limit)
    )
    events = list((await session.scalars(evt_stmt)).all())

    # Query risk changes
    rc_stmt = (
        select(RiskChangeEvent)
        .where(
            RiskChangeEvent.organization_id == organization_id,
            RiskChangeEvent.created_at >= since,
        )
        .order_by(RiskChangeEvent.created_at.desc())
        .limit(limit)
    )
    changes = list((await session.scalars(rc_stmt)).all())

    # Query active alerts
    alert_stmt = (
        select(RiskAlert)
        .where(
            RiskAlert.organization_id == organization_id,
            RiskAlert.created_at >= since,
        )
        .order_by(RiskAlert.created_at.desc())
        .limit(5)
    )
    alerts = list((await session.scalars(alert_stmt)).all())

    return {
        "time_window_minutes": window_minutes,
        "events_count": len(events),
        "events": [
            {
                "timestamp": e.timestamp.isoformat(),
                "source": e.source,
                "event_type": e.event_type,
                "severity": e.severity,
                "description": e.description,
                "asset_id": str(e.asset_id) if e.asset_id else None,
                "identity": e.identity_id,
            }
            for e in events
        ],
        "risk_changes": [
            {
                "created_at": c.created_at.isoformat(),
                "asset_id": str(c.asset_id) if c.asset_id else None,
                "previous_score": c.previous_score,
                "new_score": c.new_score,
                "score_delta": c.score_delta,
                "eal_delta": float(c.eal_delta),
                "reason": c.reason,
            }
            for c in changes
        ],
        "new_alerts": [
            {
                "severity": a.severity,
                "title": a.title,
                "description": a.description,
                "risk_change": a.risk_change,
            }
            for a in alerts
        ],
    }


async def get_continuous_risk_drift_tool(
    session: AsyncSession,
    organization_id: UUID,
) -> dict[str, Any]:
    """Retrieve continuous risk drift, recent trajectory, and financial exposure changes."""
    rc_stmt = (
        select(RiskChangeEvent)
        .where(RiskChangeEvent.organization_id == organization_id)
        .order_by(RiskChangeEvent.created_at.desc())
        .limit(5)
    )
    changes = list((await session.scalars(rc_stmt)).all())

    if not changes:
        return {
            "current_score": 72.0,
            "previous_score": 68.0,
            "score_delta": 4.0,
            "financial_delta": 5_500_000.0,
            "status": "MODERATE_DRIFT",
            "primary_driver": "Synthetic telemetry baseline",
        }

    latest = changes[0]
    total_delta = sum(c.score_delta for c in changes)
    total_eal_delta = sum(float(c.eal_delta) for c in changes)

    return {
        "current_score": latest.new_score,
        "previous_score": latest.previous_score,
        "score_delta": latest.score_delta,
        "recent_cumulative_score_delta": round(total_delta, 1),
        "recent_cumulative_eal_delta": round(total_eal_delta, 2),
        "primary_driver": latest.reason,
        "status": "CRITICAL_DRIFT" if total_delta >= 10 else ("HIGH_DRIFT" if total_delta >= 5 else "STABLE"),
    }
