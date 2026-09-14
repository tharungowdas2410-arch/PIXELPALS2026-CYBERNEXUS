from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import ComplianceStatus
from app.schemas.common import ORMModel


class ComplianceEvidenceCreate(BaseModel):
    framework: str = Field(min_length=1, max_length=64)
    control_id: UUID | None = None
    requirement: str = Field(min_length=1, max_length=512)
    status: ComplianceStatus = ComplianceStatus.NOT_ASSESSED
    evidence: str | None = None
    score: float = Field(default=0, ge=0, le=100)


class ComplianceRead(ORMModel):
    id: UUID
    organization_id: UUID
    framework: str
    control_id: UUID | None
    requirement: str
    status: ComplianceStatus
    evidence: str | None
    score: float
