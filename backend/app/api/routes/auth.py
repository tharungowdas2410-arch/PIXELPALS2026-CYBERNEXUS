from fastapi import APIRouter, HTTPException, Request, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import LoginRequest, PasswordChangeRequest, RegisterRequest, TokenResponse, UserRead
from app.schemas.common import DataResponse
from app.services.auth_service import AuthError, authenticate_user, change_user_password, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=DataResponse[TokenResponse], status_code=status.HTTP_201_CREATED)
async def register(request: Request, payload: RegisterRequest, session: DbSession) -> DataResponse[TokenResponse]:
    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    try:
        _user, token = await register_user(session, payload, correlation_id=corr_id, ip_address=client_ip)
    except AuthError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return DataResponse(data=TokenResponse(access_token=token))


@router.post("/login", response_model=DataResponse[TokenResponse])
async def login(request: Request, payload: LoginRequest, session: DbSession) -> DataResponse[TokenResponse]:
    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    try:
        _user, token = await authenticate_user(session, payload, correlation_id=corr_id, ip_address=client_ip)
    except AuthError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return DataResponse(data=TokenResponse(access_token=token))


@router.get("/me", response_model=DataResponse[UserRead])
async def me(user: CurrentUser) -> DataResponse[UserRead]:
    return DataResponse(data=UserRead.model_validate(user))


@router.post("/password-change", response_model=DataResponse[dict[str, str]])
async def password_change(
    request: Request,
    payload: PasswordChangeRequest,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict[str, str]]:
    corr_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    try:
        await change_user_password(
            session=session,
            user=user,
            current_password=payload.current_password,
            new_password=payload.new_password,
            correlation_id=corr_id,
            ip_address=client_ip,
        )
    except AuthError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return DataResponse(data={"message": "Password changed successfully"})
