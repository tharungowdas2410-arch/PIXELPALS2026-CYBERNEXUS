from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import VerificationStatus
from app.schemas.common import ORMModel


class EvidenceCreate(BaseModel):
    evidence_type: str = Field(min_length=1, max_length=64)
    entity_id: UUID
    payload: str = Field(min_length=1)


class EvidenceVerify(BaseModel):
    payload: str = Field(min_length=1)
    evidence_hash: str = Field(min_length=16)


class EvidenceRead(ORMModel):
    id: UUID
    organization_id: UUID
    evidence_type: str
    entity_id: UUID
    evidence_hash: str
    timestamp: datetime
    blockchain_network: str
    transaction_hash: str | None
    verification_status: VerificationStatus
    notes: str | None
