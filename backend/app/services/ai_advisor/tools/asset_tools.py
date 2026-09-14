"""Asset inspection tools for the AI Risk Advisor."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.control import Control
from app.models.incident import Incident
from app.models.risk import Risk
from app.models.threat import Threat
from app.models.vulnerability import Vulnerability
from app.services.ai_advisor.citations import CitationCollector


async def get_asset_details(
    session: AsyncSession,
    organization_id: UUID,
    asset_id: UUID | None = None,
    asset_name: str | None = None,
    collector: CitationCollector | None = None,
) -> dict:
    """Retrieves asset inventory details, criticality, business value, vulnerabilities, controls, and risks."""
    query = select(Asset).where(Asset.organization_id == organization_id)
    if asset_id:
        query = query.where(Asset.id == asset_id)
    elif asset_name:
        query = query.where(Asset.name.ilike(f"%{asset_name}%"))
    else:
        return {"error": "Either asset_id or asset_name must be provided."}

    asset = (await session.scalars(query)).first()
    if not asset:
        return {"error": f"Asset {asset_id or asset_name} not found."}

    vulns = list(await session.scalars(select(Vulnerability).where(Vulnerability.asset_id == asset.id)))
    risks = list(await session.scalars(select(Risk).where(Risk.asset_id == asset.id)))
    threats = list(await session.scalars(select(Threat).where(Threat.asset_id == asset.id)))
    incidents = list(await session.scalars(select(Incident).where(Incident.asset_id == asset.id)))

    if collector:
        collector.add(
            source_type="asset",
            source_id=str(asset.id),
            description=f"Asset: {asset.name} (Criticality: {asset.criticality}/5, Value: ₹{float(asset.business_value):,.0f})",
            metadata={"name": asset.name, "criticality": asset.criticality, "exposure": str(asset.exposure)},
        )

    return {
        "id": str(asset.id),
        "name": asset.name,
        "asset_type": asset.asset_type.value if hasattr(asset.asset_type, "value") else str(asset.asset_type),
        "criticality": asset.criticality,
        "business_value": float(asset.business_value),
        "exposure": asset.exposure.value if hasattr(asset.exposure, "value") else str(asset.exposure),
        "environment": asset.environment.value if hasattr(asset.environment, "value") else str(asset.environment),
        "owner": asset.owner,
        "vulnerabilities": [
            {
                "id": str(v.id),
                "title": v.title,
                "cve_id": v.cve_id,
                "severity": v.severity.value if hasattr(v.severity, "value") else str(v.severity),
                "cvss": v.cvss_score,
            }
            for v in vulns
        ],
        "active_risks": [
            {
                "id": str(r.id),
                "residual_risk": r.residual_risk,
                "risk_level": r.risk_level.value if hasattr(r.risk_level, "value") else str(r.risk_level),
                "eal": float(r.expected_annual_loss),
            }
            for r in risks
        ],
        "threats": [t.name for t in threats],
        "incident_count": len(incidents),
    }
