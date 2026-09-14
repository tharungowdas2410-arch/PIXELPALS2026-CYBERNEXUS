from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    industry: str | None = None
    country: str | None = None
    security_budget: Decimal = Decimal("0")
    description: str | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    industry: str | None = None
    country: str | None = None
    security_budget: Decimal | None = None
    description: str | None = None


class OrganizationRead(ORMModel):
    id: UUID
    name: str
    industry: str | None
    country: str | None
    security_budget: Decimal
    description: str | None
    created_at: datetime
    updated_at: datetime
