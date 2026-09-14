from uuid import UUID

from fastapi import APIRouter, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.threat import Threat
from app.schemas.common import DataResponse, PaginatedResponse
from app.schemas.threat import ThreatCreate, ThreatRead, ThreatUpdate
from app.services.query import apply_updates, get_threat_or_404, paginate

router = APIRouter(prefix="/threats", tags=["threats"])


@router.get("", response_model=PaginatedResponse[ThreatRead])
async def list_threats(
    _user: CurrentUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = None,
    active: bool | None = None,
) -> PaginatedResponse[ThreatRead]:
    query = select(Threat).order_by(Threat.name)
    if category:
        query = query.where(Threat.category == category)
    if active is not None:
        query = query.where(Threat.active.is_(active))
    rows, total = await paginate(session, query, page, page_size)
    return PaginatedResponse(
        data=[ThreatRead.model_validate(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{threat_id}", response_model=DataResponse[ThreatRead])
async def get_threat(threat_id: UUID, _user: CurrentUser, session: DbSession) -> DataResponse[ThreatRead]:
    threat = await get_threat_or_404(session, threat_id)
    return DataResponse(data=ThreatRead.model_validate(threat))


@router.post("", response_model=DataResponse[ThreatRead], status_code=status.HTTP_201_CREATED)
async def create_threat(payload: ThreatCreate, _user: CurrentUser, session: DbSession) -> DataResponse[ThreatRead]:
    threat = Threat(**payload.model_dump())
    session.add(threat)
    await session.commit()
    await session.refresh(threat)
    return DataResponse(data=ThreatRead.model_validate(threat))


@router.put("/{threat_id}", response_model=DataResponse[ThreatRead])
async def update_threat(
    threat_id: UUID,
    payload: ThreatUpdate,
    _user: CurrentUser,
    session: DbSession,
) -> DataResponse[ThreatRead]:
    threat = await get_threat_or_404(session, threat_id)
    apply_updates(threat, payload.model_dump(exclude_unset=True))
    await session.commit()
    await session.refresh(threat)
    return DataResponse(data=ThreatRead.model_validate(threat))
