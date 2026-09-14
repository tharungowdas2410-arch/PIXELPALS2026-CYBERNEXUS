from uuid import UUID

from fastapi import APIRouter, Query, Request, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.asset import Asset
from app.models.enums import RemediationStatus, Severity, UserRole
from app.models.vulnerability import Vulnerability
from app.schemas.common import DataResponse, PaginatedResponse
from app.schemas.vulnerability import VulnerabilityCreate, VulnerabilityRead, VulnerabilityUpdate
from app.services.audit_service import AuditService
from app.services.query import apply_updates, get_asset_for_org, get_vulnerability_for_org, paginate

router = APIRouter(prefix="/vulnerabilities", tags=["vulnerabilities"])


@router.get("", response_model=PaginatedResponse[VulnerabilityRead])
async def list_vulnerabilities(
    user: CurrentUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    severity: Severity | None = None,
    cvss_min: float | None = Query(default=None, ge=0, le=10),
    remediation_status: RemediationStatus | None = None,
    asset: UUID | None = None,
) -> PaginatedResponse[VulnerabilityRead]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.SECURITY_ANALYST,
        UserRole.RISK_MANAGER,
    )(user)

    query = (
        select(Vulnerability)
        .join(Asset, Vulnerability.asset_id == Asset.id)
        .where(Asset.organization_id == user.organization_id)
        .order_by(Vulnerability.title)
    )
    if severity:
        query = query.where(Vulnerability.severity == severity)
    if cvss_min is not None:
        query = query.where(Vulnerability.cvss_score >= cvss_min)
    if remediation_status:
        query = query.where(Vulnerability.remediation_status == remediation_status)
    if asset:
        query = query.where(Vulnerability.asset_id == asset)
    rows, total = await paginate(session, query, page, page_size)
    return PaginatedResponse(
        data=[VulnerabilityRead.model_validate(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{vulnerability_id}", response_model=DataResponse[VulnerabilityRead])
async def get_vulnerability(
    vulnerability_id: UUID,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[VulnerabilityRead]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.SECURITY_ANALYST,
        UserRole.RISK_MANAGER,
    )(user)
    vuln = await get_vulnerability_for_org(session, user.organization_id, vulnerability_id)
    return DataResponse(data=VulnerabilityRead.model_validate(vuln))


@router.post("", response_model=DataResponse[VulnerabilityRead], status_code=status.HTTP_201_CREATED)
async def create_vulnerability(
    request: Request,
    payload: VulnerabilityCreate,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[VulnerabilityRead]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST)(user)
    await get_asset_for_org(session, user.organization_id, payload.asset_id)
    vuln = Vulnerability(**payload.model_dump())
    session.add(vuln)
    await session.commit()
    await session.refresh(vuln)

    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="VULNERABILITY_CREATE",
        entity_type="VULNERABILITY",
        entity_id=str(vuln.id),
        result="SUCCESS",
        ip_address=client_ip,
        correlation_id=corr_id,
        details={"cve_id": vuln.cve_id, "cvss_score": vuln.cvss_score},
    )

    return DataResponse(data=VulnerabilityRead.model_validate(vuln))


@router.put("/{vulnerability_id}", response_model=DataResponse[VulnerabilityRead])
async def update_vulnerability(
    vulnerability_id: UUID,
    request: Request,
    payload: VulnerabilityUpdate,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[VulnerabilityRead]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST)(user)
    vuln = await get_vulnerability_for_org(session, user.organization_id, vulnerability_id)
    apply_updates(vuln, payload.model_dump(exclude_unset=True))
    await session.commit()
    await session.refresh(vuln)

    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="VULNERABILITY_UPDATE",
        entity_type="VULNERABILITY",
        entity_id=str(vuln.id),
        result="SUCCESS",
        ip_address=client_ip,
        correlation_id=corr_id,
    )

    return DataResponse(data=VulnerabilityRead.model_validate(vuln))
