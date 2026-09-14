from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import UserCreateRequest, UserRead, UserUpdateRequest
from app.schemas.common import DataResponse, PaginatedResponse
from app.services.auth_service import (
    AuthError,
    admin_create_user,
    admin_reset_password,
    admin_update_user,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=PaginatedResponse[UserRead])
async def list_users(
    user: CurrentUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> PaginatedResponse[UserRead]:
    require_roles(UserRole.ADMIN)(user)

    stmt = (
        select(User)
        .where(User.organization_id == user.organization_id)
        .order_by(User.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    users = list((await session.scalars(stmt)).all())

    count_stmt = select(User.id).where(User.organization_id == user.organization_id)
    total = len(list((await session.scalars(count_stmt)).all()))

    return PaginatedResponse(
        data=[UserRead.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=DataResponse[UserRead], status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,
    payload: UserCreateRequest,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[UserRead]:
    require_roles(UserRole.ADMIN)(user)
    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    try:
        new_user = await admin_create_user(
            session=session,
            organization_id=user.organization_id,
            payload=payload,
            correlation_id=corr_id,
            ip_address=client_ip,
        )
    except AuthError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return DataResponse(data=UserRead.model_validate(new_user))


@router.patch("/{user_id}", response_model=DataResponse[UserRead])
async def update_user(
    user_id: UUID,
    request: Request,
    payload: UserUpdateRequest,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[UserRead]:
    require_roles(UserRole.ADMIN)(user)
    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    try:
        updated = await admin_update_user(
            session=session,
            organization_id=user.organization_id,
            user_id=user_id,
            payload=payload,
            correlation_id=corr_id,
            ip_address=client_ip,
        )
    except AuthError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return DataResponse(data=UserRead.model_validate(updated))


@router.post("/{user_id}/reset-password", response_model=DataResponse[dict[str, str]])
async def reset_password(
    user_id: UUID,
    request: Request,
    payload: dict[str, str],
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict[str, str]]:
    require_roles(UserRole.ADMIN)(user)
    new_password = payload.get("new_password") or f"TempPass_{uuid4().hex[:6]}!"

    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    try:
        await admin_reset_password(
            session=session,
            organization_id=user.organization_id,
            user_id=user_id,
            new_password=new_password,
            correlation_id=corr_id,
            ip_address=client_ip,
        )
    except AuthError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return DataResponse(data={"message": "Password reset successfully", "temporary_password": new_password})
