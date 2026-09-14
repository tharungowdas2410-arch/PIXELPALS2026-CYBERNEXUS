from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.control import Control
from app.models.incident import Incident
from app.models.organization import Organization
from app.models.risk import Risk
from app.models.threat import Threat
from app.models.vulnerability import Vulnerability


def apply_updates(instance: object, data: dict) -> None:
    for key, value in data.items():
        setattr(instance, key, value)


async def paginate(session: AsyncSession, query: Select, page: int, page_size: int) -> tuple[list, int]:
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = int(await session.scalar(count_query) or 0)
    rows = (await session.scalars(query.offset((page - 1) * page_size).limit(page_size))).all()
    return list(rows), total


async def get_org_or_404(session: AsyncSession, organization_id: UUID) -> Organization:
    org = await session.get(Organization, organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    return org


async def get_asset_for_org(session: AsyncSession, organization_id: UUID, asset_id: UUID) -> Asset:
    asset = await session.get(Asset, asset_id)
    if asset is None or asset.organization_id != organization_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    return asset


async def get_control_for_org(session: AsyncSession, organization_id: UUID, control_id: UUID) -> Control:
    control = await session.get(Control, control_id)
    if control is None or control.organization_id != organization_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Control not found")
    return control


async def get_vulnerability_for_org(
    session: AsyncSession,
    organization_id: UUID,
    vulnerability_id: UUID,
) -> Vulnerability:
    vuln = await session.get(Vulnerability, vulnerability_id)
    if vuln is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vulnerability not found")
    asset = await session.get(Asset, vuln.asset_id)
    if asset is None or asset.organization_id != organization_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vulnerability not found")
    return vuln


async def get_threat_or_404(session: AsyncSession, threat_id: UUID) -> Threat:
    threat = await session.get(Threat, threat_id)
    if threat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Threat not found")
    return threat


async def get_risk_for_org(session: AsyncSession, organization_id: UUID, risk_id: UUID) -> Risk:
    risk = await session.get(Risk, risk_id)
    if risk is None or risk.organization_id != organization_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Risk not found")
    return risk


async def get_incident_for_org(session: AsyncSession, organization_id: UUID, incident_id: UUID) -> Incident:
    incident = await session.get(Incident, incident_id)
    if incident is None or incident.organization_id != organization_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Incident not found")
    return incident
