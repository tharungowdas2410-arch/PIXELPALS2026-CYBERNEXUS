from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.compliance import ComplianceRecord
from app.models.enums import UserRole
from app.schemas.common import DataResponse
from app.schemas.compliance import ComplianceEvidenceCreate, ComplianceRead
from app.services.audit_service import AuditService
from app.services.compliance_service import compliance_summary

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/summary")
async def summary(user: CurrentUser, session: DbSession) -> DataResponse[dict]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.RISK_MANAGER,
        UserRole.EXECUTIVE,
        UserRole.SECURITY_ANALYST,
    )(user)
    return DataResponse(data=await compliance_summary(session, user.organization_id))


@router.get("/{framework}")
async def by_framework(framework: str, user: CurrentUser, session: DbSession) -> DataResponse[list]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.RISK_MANAGER,
        UserRole.SECURITY_ANALYST,
    )(user)
    rows = list(
        await session.scalars(
            select(ComplianceRecord).where(
                ComplianceRecord.organization_id == user.organization_id,
                ComplianceRecord.framework == framework,
            )
        )
    )
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Framework not found")
    return DataResponse(data=[ComplianceRead.model_validate(row).model_dump(mode="json") for row in rows])


@router.post("/evidence", status_code=status.HTTP_201_CREATED)
async def add_evidence(
    payload: ComplianceEvidenceCreate,
    user: CurrentUser,
    session: DbSession,
    request: Request,
) -> DataResponse[ComplianceRead]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER)(user)
    row = ComplianceRecord(organization_id=user.organization_id, **payload.model_dump())
    session.add(row)
    await session.commit()
    await session.refresh(row)

    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="CREATE_COMPLIANCE_EVIDENCE",
        entity_type="ComplianceRecord",
        entity_id=str(row.id),
        result="SUCCESS",
        details={"framework": row.framework, "requirement": row.requirement},
        request=request,
    )
    return DataResponse(data=ComplianceRead.model_validate(row))
