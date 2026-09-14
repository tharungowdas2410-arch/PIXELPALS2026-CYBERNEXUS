from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.enums import UserRole
from app.schemas.common import PaginatedResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    user_id: UUID | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    result: str
    ip_address: str | None = None
    user_agent: str | None = None
    correlation_id: str | None = None
    details: dict[str, Any]
    timestamp: datetime


@router.get("", response_model=PaginatedResponse[AuditLogRead])
async def list_audit_logs(
    user: CurrentUser,
    session: DbSession,
    action: str | None = None,
    entity_type: str | None = None,
    result: str | None = None,
    correlation_id: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> PaginatedResponse[AuditLogRead]:
    """Retrieve immutable audit trails scoped to authenticated organization."""
    require_roles(UserRole.ADMIN, UserRole.CISO)(user)

    offset = (page - 1) * page_size
    logs, total = await AuditService.query_logs(
        session=session,
        organization_id=user.organization_id,
        action=action,
        entity_type=entity_type,
        result=result,
        correlation_id=correlation_id,
        start_time=start_time,
        end_time=end_time,
        limit=page_size,
        offset=offset,
    )

    return PaginatedResponse(
        data=[AuditLogRead.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
    )
