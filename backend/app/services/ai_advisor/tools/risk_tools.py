"""Risk inspection and retrieval tools for the AI Risk Advisor."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.control import Control
from app.models.risk import Risk
from app.models.threat import Threat
from app.models.vulnerability import Vulnerability
from app.services.ai_advisor.citations import CitationCollector


def compute_risk_level(score: float) -> str:
    if score >= 80.0:
        return "CRITICAL"
    if score >= 60.0:
        return "HIGH"
    if score >= 40.0:
        return "MEDIUM"
    return "LOW"


async def list_top_risks(
    session: AsyncSession,
    organization_id: UUID,
    limit: int = 5,
    severity: str | None = None,
    asset_id: UUID | None = None,
    status: str | None = None,
    collector: CitationCollector | None = None,
) -> dict:
    """Lists prioritized risk calculations with residual scores, financial exposure, and linked assets."""
    query = (
        select(Risk, Asset)
        .outerjoin(Asset, Risk.asset_id == Asset.id)
        .where(Risk.organization_id == organization_id)
        .order_by(Risk.residual_risk.desc())
    )
    if asset_id:
        query = query.where(Risk.asset_id == asset_id)
    if status:
        query = query.where(Risk.status == status)

    limit = max(1, min(limit, 20))
    query = query.limit(limit * 2 if severity else limit)
    rows = list(await session.execute(query))

    items = []
    for r, a in rows:
        asset_name = a.name if a else "Unknown Asset"
        inherent = getattr(r, "inherent_risk", r.risk_score)
        level = compute_risk_level(r.residual_risk)

        if severity and level.upper() != severity.upper():
            continue

        item = {
            "risk_id": str(r.id),
            "asset_id": str(r.asset_id) if r.asset_id else None,
            "asset_name": asset_name,
            "risk_score": r.residual_risk,
            "residual_risk": r.residual_risk,
            "inherent_risk": inherent,
            "likelihood": r.likelihood,
            "impact": r.impact,
            "risk_level": level,
            "financial_exposure": float(r.financial_exposure),
            "expected_annual_loss": float(r.expected_annual_loss),
            "drivers": r.drivers or [],
            "calculated_at": r.calculated_at.isoformat() if r.calculated_at else None,
        }
        items.append(item)
        if collector:
            collector.add(
                source_type="risk",
                source_id=str(r.id),
                description=f"Residual risk {r.residual_risk:.1f} on {asset_name} (EAL: ₹{float(r.expected_annual_loss):,.0f})",
                metadata={"asset_name": asset_name, "residual_risk": r.residual_risk, "eal": float(r.expected_annual_loss)},
            )
        if len(items) >= limit:
            break

    return {
        "risks": items,
        "count": len(items),
        "total_count": len(items),
        "total_eal_in_sample": round(sum(i["expected_annual_loss"] for i in items), 2),
        "total_exposure_in_sample": round(sum(i["financial_exposure"] for i in items), 2),
    }


async def get_risk_details(
    session: AsyncSession,
    organization_id: UUID,
    risk_id: UUID,
    collector: CitationCollector | None = None,
) -> dict:
    """Retrieves full risk calculation details including linked asset, vulnerability, threat, and controls."""
    r = await session.get(Risk, risk_id)
    if not r or r.organization_id != organization_id:
        return {"error": f"Risk record {risk_id} not found."}

    asset = await session.get(Asset, r.asset_id) if r.asset_id else None
    vuln = await session.get(Vulnerability, r.vulnerability_id) if r.vulnerability_id else None
    threat = await session.get(Threat, r.threat_id) if r.threat_id else None
    control = await session.get(Control, r.control_id) if r.control_id else None

    asset_name = asset.name if asset else "Unassigned"
    inherent = getattr(r, "inherent_risk", r.risk_score)
    level = compute_risk_level(r.residual_risk)

    if collector:
        collector.add(
            source_type="risk_detail",
            source_id=str(r.id),
            description=f"Detailed risk calculation for {asset_name} (Level: {level})",
            metadata={"residual_risk": r.residual_risk, "factors": r.factors},
        )

    return {
        "risk_id": str(r.id),
        "asset": {
            "id": str(asset.id) if asset else None,
            "name": asset_name,
            "criticality": asset.criticality if asset else None,
            "exposure": str(asset.exposure) if asset and asset.exposure else None,
        },
        "vulnerability": {
            "id": str(vuln.id) if vuln else None,
            "title": vuln.title if vuln else None,
            "severity": vuln.severity.value if vuln and hasattr(vuln.severity, "value") else str(vuln.severity) if vuln else None,
            "cve_id": vuln.cve_id if vuln else None,
            "cvss_score": vuln.cvss_score if vuln else None,
        } if vuln else None,
        "threat": {
            "id": str(threat.id) if threat else None,
            "name": threat.name if threat else None,
            "threat_type": threat.threat_type if threat else None,
        } if threat else None,
        "control": {
            "id": str(control.id) if control else None,
            "name": control.name if control else None,
            "effectiveness": float(control.effectiveness) if control else None,
        } if control else None,
        "inherent_risk": inherent,
        "residual_risk": r.residual_risk,
        "likelihood": r.likelihood,
        "impact": r.impact,
        "risk_level": level,
        "financial_exposure": float(r.financial_exposure),
        "expected_annual_loss": float(r.expected_annual_loss),
        "drivers": r.drivers or [],
        "factors": r.factors or {},
        "status": r.status.value if hasattr(r.status, "value") else str(r.status),
        "calculated_at": r.calculated_at.isoformat() if r.calculated_at else None,
    }
