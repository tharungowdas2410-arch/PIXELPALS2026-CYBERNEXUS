from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import ImplementationStatus
from app.schemas.common import ORMModel


class ControlCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    framework: str = Field(min_length=1, max_length=64)
    category: str = Field(min_length=1, max_length=128)
    effectiveness: float = Field(default=0.0, ge=0, le=1)
    implementation_status: ImplementationStatus = ImplementationStatus.PLANNED
    annual_cost: Decimal = Decimal("0")
    description: str | None = None


class ControlUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    framework: str | None = None
    category: str | None = None
    effectiveness: float | None = Field(default=None, ge=0, le=1)
    implementation_status: ImplementationStatus | None = None
    annual_cost: Decimal | None = None
    description: str | None = None


class ControlRead(ORMModel):
    id: UUID
    organization_id: UUID
    name: str
    framework: str
    category: str
    effectiveness: float
    implementation_status: ImplementationStatus
    annual_cost: Decimal
    description: str | None
    created_at: datetime
    updated_at: datetime
