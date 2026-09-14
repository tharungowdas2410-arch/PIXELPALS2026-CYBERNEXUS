from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.blockchain import EvidenceCreate, EvidenceRead, EvidenceVerify
from app.schemas.common import DataResponse
from app.services.blockchain_service import get_evidence, list_evidence, record_evidence, verify_evidence

router = APIRouter(prefix="/blockchain", tags=["blockchain"])


@router.get("")
async def list_records(user: CurrentUser, session: DbSession) -> DataResponse[list]:
    rows = await list_evidence(session, user.organization_id)
    return DataResponse(data=[EvidenceRead.model_validate(row).model_dump(mode="json") for row in rows])


@router.get("/{evidence_id}")
async def get_record(evidence_id: UUID, user: CurrentUser, session: DbSession) -> DataResponse[EvidenceRead]:
    row = await get_evidence(session, user.organization_id, evidence_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence not found")
    return DataResponse(data=EvidenceRead.model_validate(row))


@router.post("/record", status_code=status.HTTP_201_CREATED)
async def record(payload: EvidenceCreate, user: CurrentUser, session: DbSession) -> DataResponse[EvidenceRead]:
    row = await record_evidence(
        session,
        organization_id=user.organization_id,
        evidence_type=payload.evidence_type,
        entity_id=payload.entity_id,
        payload=payload.payload,
    )
    return DataResponse(data=EvidenceRead.model_validate(row))


@router.post("/verify")
async def verify(payload: EvidenceVerify, _user: CurrentUser) -> DataResponse[dict]:
    ok = verify_evidence(payload.payload, payload.evidence_hash)
    return DataResponse(data={"valid": ok, "verification_status": "verified" if ok else "failed"})
