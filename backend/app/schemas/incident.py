from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import IncidentStatus, Severity
from app.schemas.common import ORMModel


class IncidentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    severity: Severity
    status: IncidentStatus = IncidentStatus.NEW
    detected_at: datetime | None = None
    resolved_at: datetime | None = None
    estimated_loss: float = 0
    affected_assets: list[str] = Field(default_factory=list)
    description: str | None = None


class IncidentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    severity: Severity | None = None
    status: IncidentStatus | None = None
    detected_at: datetime | None = None
    resolved_at: datetime | None = None
    estimated_loss: float | None = None
    affected_assets: list[str] | None = None
    description: str | None = None


class IncidentRead(ORMModel):
    id: UUID
    organization_id: UUID
    title: str
    severity: Severity
    status: IncidentStatus
    detected_at: datetime | None
    resolved_at: datetime | None
    estimated_loss: float
    affected_assets: list[str] | None
    description: str | None
    created_at: datetime
