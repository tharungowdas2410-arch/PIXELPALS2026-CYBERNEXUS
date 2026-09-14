from uuid import UUID

from fastapi import APIRouter, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.control import Control
from app.models.enums import ImplementationStatus
from app.schemas.common import DataResponse, PaginatedResponse
from app.schemas.control import ControlCreate, ControlRead, ControlUpdate
from app.services.query import apply_updates, get_control_for_org, paginate

router = APIRouter(prefix="/controls", tags=["controls"])


@router.get("", response_model=PaginatedResponse[ControlRead])
async def list_controls(
    user: CurrentUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    framework: str | None = None,
    implementation_status: ImplementationStatus | None = None,
    category: str | None = None,
) -> PaginatedResponse[ControlRead]:
    query = select(Control).where(Control.organization_id == user.organization_id).order_by(Control.name)
    if framework:
        query = query.where(Control.framework == framework)
    if implementation_status:
        query = query.where(Control.implementation_status == implementation_status)
    if category:
        query = query.where(Control.category == category)
    rows, total = await paginate(session, query, page, page_size)
    return PaginatedResponse(
        data=[ControlRead.model_validate(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{control_id}", response_model=DataResponse[ControlRead])
async def get_control(control_id: UUID, user: CurrentUser, session: DbSession) -> DataResponse[ControlRead]:
    control = await get_control_for_org(session, user.organization_id, control_id)
    return DataResponse(data=ControlRead.model_validate(control))


@router.post("", response_model=DataResponse[ControlRead], status_code=status.HTTP_201_CREATED)
async def create_control(payload: ControlCreate, user: CurrentUser, session: DbSession) -> DataResponse[ControlRead]:
    control = Control(organization_id=user.organization_id, **payload.model_dump())
    session.add(control)
    await session.commit()
    await session.refresh(control)
    return DataResponse(data=ControlRead.model_validate(control))


@router.put("/{control_id}", response_model=DataResponse[ControlRead])
async def update_control(
    control_id: UUID,
    payload: ControlUpdate,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[ControlRead]:
    control = await get_control_for_org(session, user.organization_id, control_id)
    apply_updates(control, payload.model_dump(exclude_unset=True))
    await session.commit()
    await session.refresh(control)
    return DataResponse(data=ControlRead.model_validate(control))


@router.delete("/{control_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_control(control_id: UUID, user: CurrentUser, session: DbSession) -> None:
    control = await get_control_for_org(session, user.organization_id, control_id)
    await session.delete(control)
    await session.commit()
