from uuid import UUID

from fastapi import APIRouter, Query, Request, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.enums import IncidentStatus, Severity, UserRole
from app.models.incident import Incident
from app.schemas.common import DataResponse, PaginatedResponse
from app.schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate
from app.services.audit_service import AuditService
from app.services.query import apply_updates, get_incident_for_org, paginate

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=PaginatedResponse[IncidentRead])
async def list_incidents(
    user: CurrentUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    severity: Severity | None = None,
    status_filter: IncidentStatus | None = Query(default=None, alias="status"),
) -> PaginatedResponse[IncidentRead]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST)(user)

    query = select(Incident).where(Incident.organization_id == user.organization_id).order_by(Incident.title)
    if severity:
        query = query.where(Incident.severity == severity)
    if status_filter:
        query = query.where(Incident.status == status_filter)
    rows, total = await paginate(session, query, page, page_size)
    return PaginatedResponse(data=[IncidentRead.model_validate(row) for row in rows], total=total, page=page, page_size=page_size)


@router.get("/{incident_id}", response_model=DataResponse[IncidentRead])
async def get_incident(incident_id: UUID, user: CurrentUser, session: DbSession) -> DataResponse[IncidentRead]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST)(user)
    incident = await get_incident_for_org(session, user.organization_id, incident_id)
    return DataResponse(data=IncidentRead.model_validate(incident))


@router.post("", response_model=DataResponse[IncidentRead], status_code=status.HTTP_201_CREATED)
async def create_incident(
    request: Request,
    payload: IncidentCreate,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[IncidentRead]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST)(user)
    incident = Incident(organization_id=user.organization_id, **payload.model_dump())
    session.add(incident)
    await session.commit()
    await session.refresh(incident)

    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="INCIDENT_CREATE",
        entity_type="INCIDENT",
        entity_id=str(incident.id),
        result="SUCCESS",
        ip_address=client_ip,
        correlation_id=corr_id,
        details={"title": incident.title, "severity": incident.severity.value},
    )

    return DataResponse(data=IncidentRead.model_validate(incident))


@router.put("/{incident_id}", response_model=DataResponse[IncidentRead])
async def update_incident(
    incident_id: UUID,
    request: Request,
    payload: IncidentUpdate,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[IncidentRead]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST)(user)
    incident = await get_incident_for_org(session, user.organization_id, incident_id)
    apply_updates(incident, payload.model_dump(exclude_unset=True))
    await session.commit()
    await session.refresh(incident)

    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="INCIDENT_UPDATE",
        entity_type="INCIDENT",
        entity_id=str(incident.id),
        result="SUCCESS",
        ip_address=client_ip,
        correlation_id=corr_id,
    )

    return DataResponse(data=IncidentRead.model_validate(incident))
