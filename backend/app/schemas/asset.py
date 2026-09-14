from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import AssetType
from app.schemas.common import ORMModel


class AssetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    asset_type: AssetType
    owner: str | None = None
    environment: str | None = None
    criticality: int = Field(ge=1, le=5)
    business_value: Decimal = Decimal("0")
    exposure: str | None = None
    data_sensitivity: str | None = None
    availability_requirement: str | None = None
    integrity_requirement: str | None = None
    confidentiality_requirement: str | None = None
    description: str | None = None


class AssetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    asset_type: AssetType | None = None
    owner: str | None = None
    environment: str | None = None
    criticality: int | None = Field(default=None, ge=1, le=5)
    business_value: Decimal | None = None
    exposure: str | None = None
    data_sensitivity: str | None = None
    availability_requirement: str | None = None
    integrity_requirement: str | None = None
    confidentiality_requirement: str | None = None
    description: str | None = None


class AssetRead(ORMModel):
    id: UUID
    organization_id: UUID
    name: str
    asset_type: AssetType
    owner: str | None
    environment: str | None
    criticality: int
    business_value: Decimal
    exposure: str | None
    data_sensitivity: str | None
    availability_requirement: str | None
    integrity_requirement: str | None
    confidentiality_requirement: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime
