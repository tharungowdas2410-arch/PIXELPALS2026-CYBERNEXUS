from uuid import UUID

from fastapi import APIRouter, Query, Request, status
from sqlalchemy import or_, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.asset import Asset
from app.models.enums import AssetType, UserRole
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate
from app.schemas.common import DataResponse, PaginatedResponse
from app.services.audit_service import AuditService
from app.services.query import apply_updates, get_asset_for_org, paginate

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=PaginatedResponse[AssetRead])
async def list_assets(
    user: CurrentUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    criticality: int | None = Query(default=None, ge=1, le=5),
    environment: str | None = None,
    asset_type: AssetType | None = None,
    search: str | None = None,
) -> PaginatedResponse[AssetRead]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.SECURITY_ANALYST,
        UserRole.RISK_MANAGER,
        UserRole.EXECUTIVE,
    )(user)

    query = select(Asset).where(Asset.organization_id == user.organization_id).order_by(Asset.name)
    if criticality is not None:
        query = query.where(Asset.criticality == criticality)
    if environment:
        query = query.where(Asset.environment == environment)
    if asset_type:
        query = query.where(Asset.asset_type == asset_type)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Asset.name.ilike(pattern), Asset.owner.ilike(pattern)))
    rows, total = await paginate(session, query, page, page_size)
    return PaginatedResponse(
        data=[AssetRead.model_validate(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{asset_id}", response_model=DataResponse[AssetRead])
async def get_asset(asset_id: UUID, user: CurrentUser, session: DbSession) -> DataResponse[AssetRead]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.SECURITY_ANALYST,
        UserRole.RISK_MANAGER,
        UserRole.EXECUTIVE,
    )(user)
    asset = await get_asset_for_org(session, user.organization_id, asset_id)
    return DataResponse(data=AssetRead.model_validate(asset))


@router.post("", response_model=DataResponse[AssetRead], status_code=status.HTTP_201_CREATED)
async def create_asset(
    request: Request,
    payload: AssetCreate,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[AssetRead]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST)(user)
    asset = Asset(organization_id=user.organization_id, **payload.model_dump())
    session.add(asset)
    await session.commit()
    await session.refresh(asset)

    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="ASSET_CREATE",
        entity_type="ASSET",
        entity_id=str(asset.id),
        result="SUCCESS",
        ip_address=client_ip,
        correlation_id=corr_id,
        details={"name": asset.name, "criticality": asset.criticality},
    )

    return DataResponse(data=AssetRead.model_validate(asset))


@router.put("/{asset_id}", response_model=DataResponse[AssetRead])
async def update_asset(
    asset_id: UUID,
    request: Request,
    payload: AssetUpdate,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[AssetRead]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST)(user)
    asset = await get_asset_for_org(session, user.organization_id, asset_id)
    apply_updates(asset, payload.model_dump(exclude_unset=True))
    await session.commit()
    await session.refresh(asset)

    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="ASSET_UPDATE",
        entity_type="ASSET",
        entity_id=str(asset.id),
        result="SUCCESS",
        ip_address=client_ip,
        correlation_id=corr_id,
    )

    return DataResponse(data=AssetRead.model_validate(asset))


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: UUID,
    request: Request,
    user: CurrentUser,
    session: DbSession,
) -> None:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST)(user)
    asset = await get_asset_for_org(session, user.organization_id, asset_id)
    await session.delete(asset)
    await session.commit()

    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="ASSET_DELETE",
        entity_type="ASSET",
        entity_id=str(asset_id),
        result="SUCCESS",
        ip_address=client_ip,
        correlation_id=corr_id,
    )
