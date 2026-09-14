from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ThreatCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=128)
    likelihood: float = Field(default=0.0, ge=0, le=1)
    sophistication: float = Field(default=0.0, ge=0, le=1)
    active: bool = True
    description: str | None = None


class ThreatUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = None
    likelihood: float | None = Field(default=None, ge=0, le=1)
    sophistication: float | None = Field(default=None, ge=0, le=1)
    active: bool | None = None
    description: str | None = None


class ThreatRead(ORMModel):
    id: UUID
    name: str
    category: str
    likelihood: float
    sophistication: float
    active: bool
    description: str | None
    created_at: datetime
    updated_at: datetime
