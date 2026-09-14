"""Dashboard aggregation for the overview API."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import RiskLevel, RiskStatus
from app.models.incident import Incident
from app.models.investment import Investment
from app.models.risk import Risk
from app.services.compliance_service import compliance_summary
from app.services.risk_engine import summarize_risks
from app.utils.calculations import FORMULAS, risk_level


async def overview(session: AsyncSession, organization_id: UUID) -> dict:
    risks = list(await session.scalars(select(Risk).where(Risk.organization_id == organization_id)))
    summary = summarize_risks(risks)
    open_risks = [item for item in risks if item.status == RiskStatus.OPEN]
    scores = [item.residual_risk for item in open_risks]
    enterprise = round(sum(scores) / len(scores), 1) if scores else 0.0
    exposure = summary["total_financial_exposure"]
    eal = summary["total_expected_annual_loss"]
    critical = summary["by_level"][RiskLevel.CRITICAL.value]
    investments = list(await session.scalars(select(Investment).where(Investment.organization_id == organization_id)))
    opportunity = round(sum(float(item.estimated_loss_avoided) for item in investments if item.recommended), 2)
    incidents = list(
        await session.scalars(
            select(Incident)
            .where(Incident.organization_id == organization_id)
            .order_by(Incident.detected_at.desc())
            .limit(5)
        )
    )
    top = sorted(open_risks, key=lambda item: item.residual_risk, reverse=True)[:5]
    now = datetime.now(UTC)
    trend = [
        {
            "date": (now - timedelta(days=30 - i * 5)).date().isoformat(),
            "risk": enterprise,
        }
        for i in range(7)
    ]
    buckets = [
        {"percentile": "p50", "loss": round(eal * 0.7, 2)},
        {"percentile": "p75", "loss": round(eal * 0.95, 2)},
        {"percentile": "p90", "loss": round(exposure * 0.75, 2)},
        {"percentile": "p95", "loss": round(exposure, 2)},
        {"percentile": "p99", "loss": round(exposure * 1.25, 2)},
    ]
    compliance = await compliance_summary(session, organization_id)
    return {
        "enterprise_risk_score": enterprise,
        "average_inherent_risk": summary["average_inherent_risk"],
        "average_residual_risk": summary["average_residual_risk"],
        "risk_reduction": summary["risk_reduction"],
        "total_financial_exposure": exposure,
        "expected_annual_loss": eal,
        "risk_reduction_opportunity": opportunity,
        "active_critical_risks": critical,
        "open_risk_count": summary["count"],
        "by_level": summary["by_level"],
        "top_drivers": summary["top_drivers"],
        "linked_chain_complete": summary["linked_chain_complete"],
        "risk_trend": trend,
        "top_risk_contributors": [
            {
                "id": str(item.id),
                "residual_risk": item.residual_risk,
                "inherent_risk": item.risk_score,
                "risk_level": risk_level(item.residual_risk).value,
                "financial_exposure": float(item.financial_exposure),
                "drivers": item.drivers or [],
            }
            for item in top
        ],
        "financial_loss_distribution": buckets,
        "investment_opportunities": [
            {
                "id": str(item.id),
                "name": item.name,
                "cost": float(item.cost),
                "estimated_loss_avoided": float(item.estimated_loss_avoided),
                "rosi": item.rosi,
                "recommended": item.recommended,
            }
            for item in investments[:8]
        ],
        "recent_incidents": [
            {
                "id": str(item.id),
                "title": item.title,
                "severity": item.severity.value,
                "status": item.status.value,
                "estimated_loss": float(item.estimated_loss),
            }
            for item in incidents
        ],
        "compliance_summary": compliance,
        "formulas": dict(FORMULAS),
        "illustrative": True,
        "as_of": now.isoformat(),
    }
