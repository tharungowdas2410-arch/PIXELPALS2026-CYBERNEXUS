from collections import defaultdict
from datetime import UTC, datetime
import time
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, hash_password, validate_password_policy, verify_password
from app.models.enums import UserRole
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserCreateRequest, UserUpdateRequest
from app.services.audit_service import AuditService


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# In-memory tracking of failed login attempts for brute-force protection
_failed_login_attempts: dict[str, list[float]] = defaultdict(list)


def _check_and_record_failure(email: str) -> None:
    now = time.time()
    window = settings.account_lockout_minutes * 60
    recent = [ts for ts in _failed_login_attempts[email] if now - ts < window]
    recent.append(now)
    _failed_login_attempts[email] = recent


def _is_locked_out(email: str) -> bool:
    now = time.time()
    window = settings.account_lockout_minutes * 60
    recent = [ts for ts in _failed_login_attempts[email] if now - ts < window]
    return len(recent) >= settings.max_failed_login_attempts


def _clear_failures(email: str) -> None:
    _failed_login_attempts.pop(email, None)


async def register_user(
    session: AsyncSession,
    payload: RegisterRequest,
    correlation_id: str | None = None,
    ip_address: str | None = None,
) -> tuple[User, str]:
    existing = await session.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise AuthError("An account with this email already exists", 409)

    organization = Organization(
        name=payload.organization_name,
        industry=payload.industry,
        country=payload.country,
        security_budget=0,
    )
    session.add(organization)
    await session.flush()

    user = User(
        organization_id=organization.id,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role or UserRole.ADMIN,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    await AuditService.log_action(
        session=session,
        organization_id=organization.id,
        user_id=user.id,
        action="USER_REGISTER",
        entity_type="USER",
        entity_id=str(user.id),
        result="SUCCESS",
        ip_address=ip_address,
        correlation_id=correlation_id,
        details={"email": user.email, "role": user.role.value},
    )

    token = create_access_token(subject=user.id, organization_id=user.organization_id, role=user.role.value)
    return user, token


async def authenticate_user(
    session: AsyncSession,
    payload: LoginRequest,
    correlation_id: str | None = None,
    ip_address: str | None = None,
) -> tuple[User, str]:
    email_key = payload.email.lower()

    if _is_locked_out(email_key):
        raise AuthError(
            f"Account is temporarily locked due to excessive failed attempts. Please retry in {settings.account_lockout_minutes} minutes.",
            429,
        )

    user = await session.scalar(select(User).where(User.email == email_key))
    if user is None or not verify_password(payload.password, user.password_hash):
        _check_and_record_failure(email_key)
        if user:
            await AuditService.log_action(
                session=session,
                organization_id=user.organization_id,
                user_id=user.id,
                action="LOGIN_FAILED",
                entity_type="AUTH",
                result="FAILURE",
                ip_address=ip_address,
                correlation_id=correlation_id,
                details={"email": email_key, "reason": "Invalid credentials"},
            )
        raise AuthError("Invalid email or password", 401)

    if not user.is_active:
        raise AuthError("Account is inactive", 403)

    _clear_failures(email_key)

    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="LOGIN_SUCCESS",
        entity_type="AUTH",
        result="SUCCESS",
        ip_address=ip_address,
        correlation_id=correlation_id,
        details={"email": user.email, "role": user.role.value},
    )

    token = create_access_token(subject=user.id, organization_id=user.organization_id, role=user.role.value)
    return user, token


async def change_user_password(
    session: AsyncSession,
    user: User,
    current_password: str,
    new_password: str,
    correlation_id: str | None = None,
    ip_address: str | None = None,
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise AuthError("Current password is incorrect", 400)

    validate_password_policy(new_password)
    user.password_hash = hash_password(new_password)
    await session.commit()

    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="PASSWORD_CHANGE",
        entity_type="USER",
        entity_id=str(user.id),
        result="SUCCESS",
        ip_address=ip_address,
        correlation_id=correlation_id,
    )


async def admin_create_user(
    session: AsyncSession,
    organization_id: UUID,
    payload: UserCreateRequest,
    correlation_id: str | None = None,
    ip_address: str | None = None,
) -> User:
    existing = await session.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise AuthError("A user with this email already exists", 409)

    validate_password_policy(payload.password)
    new_user = User(
        organization_id=organization_id,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    await AuditService.log_action(
        session=session,
        organization_id=organization_id,
        user_id=new_user.id,
        action="USER_CREATE",
        entity_type="USER",
        entity_id=str(new_user.id),
        result="SUCCESS",
        ip_address=ip_address,
        correlation_id=correlation_id,
        details={"email": new_user.email, "role": new_user.role.value},
    )
    return new_user


async def admin_update_user(
    session: AsyncSession,
    organization_id: UUID,
    user_id: UUID,
    payload: UserUpdateRequest,
    correlation_id: str | None = None,
    ip_address: str | None = None,
) -> User:
    user = await session.get(User, user_id)
    if not user or user.organization_id != organization_id:
        raise AuthError("User not found", 404)

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    await session.commit()
    await session.refresh(user)

    await AuditService.log_action(
        session=session,
        organization_id=organization_id,
        user_id=user.id,
        action="USER_UPDATE",
        entity_type="USER",
        entity_id=str(user.id),
        result="SUCCESS",
        ip_address=ip_address,
        correlation_id=correlation_id,
        details={"role": user.role.value, "is_active": user.is_active},
    )
    return user


async def admin_reset_password(
    session: AsyncSession,
    organization_id: UUID,
    user_id: UUID,
    new_password: str,
    correlation_id: str | None = None,
    ip_address: str | None = None,
) -> None:
    user = await session.get(User, user_id)
    if not user or user.organization_id != organization_id:
        raise AuthError("User not found", 404)

    validate_password_policy(new_password)
    user.password_hash = hash_password(new_password)
    await session.commit()

    await AuditService.log_action(
        session=session,
        organization_id=organization_id,
        user_id=user.id,
        action="PASSWORD_RESET_ADMIN",
        entity_type="USER",
        entity_id=str(user.id),
        result="SUCCESS",
        ip_address=ip_address,
        correlation_id=correlation_id,
    )


async def get_user_by_id(session: AsyncSession, user_id: UUID) -> User | None:
    return await session.get(User, user_id)


def utcnow() -> datetime:
    return datetime.now(UTC)
