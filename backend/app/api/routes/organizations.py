from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.models.enums import UserRole
from app.schemas.common import DataResponse
from app.schemas.organization import OrganizationRead, OrganizationUpdate
from app.services.query import apply_updates, get_org_or_404

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/me", response_model=DataResponse[OrganizationRead])
async def get_my_organization(user: CurrentUser, session: DbSession) -> DataResponse[OrganizationRead]:
    org = await get_org_or_404(session, user.organization_id)
    return DataResponse(data=OrganizationRead.model_validate(org))


@router.get("/{organization_id}", response_model=DataResponse[OrganizationRead])
async def get_organization(
    organization_id: UUID,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[OrganizationRead]:
    if organization_id != user.organization_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot access another organization")
    org = await get_org_or_404(session, organization_id)
    return DataResponse(data=OrganizationRead.model_validate(org))


@router.put("/{organization_id}", response_model=DataResponse[OrganizationRead])
async def update_organization(
    organization_id: UUID,
    payload: OrganizationUpdate,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[OrganizationRead]:
    if organization_id != user.organization_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot access another organization")
    if user.role not in {UserRole.ADMIN, UserRole.CISO}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
    org = await get_org_or_404(session, organization_id)
    apply_updates(org, payload.model_dump(exclude_unset=True))
    await session.commit()
    await session.refresh(org)
    return DataResponse(data=OrganizationRead.model_validate(org))
