"""Advisor API Endpoints for AI-Powered Cyber Risk Quantification & Investment Optimization."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.core.ai_config import get_ai_config
from app.models.advisor_audit import AdvisorAuditLog
from app.models.blockchain_evidence import BlockchainEvidence
from app.models.enums import UserRole
from app.models.knowledge import KnowledgeDocument
from app.schemas.advisor import (
    AdvisorAskRequest,
    AdvisorAuditLogRead,
    AdvisorDecisionBrief,
    AdvisorPlan,
    AdvisorPlanRequest,
    AdvisorResponse,
)
from app.schemas.common import DataResponse
from app.services.ai_advisor.advisor_service import AIAdvisorService

router = APIRouter(prefix="/advisor", tags=["advisor"])
advisor_service = AIAdvisorService()


@router.get("/questions")
async def questions(_user: CurrentUser) -> DataResponse[list[str]]:
    """Return recommended strategic risk and investment questions."""
    return DataResponse(
        data=[
            "What are my top risks?",
            "Why is payment service high risk?",
            "What should I fix first?",
            "What happens if I add MFA?",
            "Where should I spend ₹50 lakh?",
            "What is our 95% Value at Risk (VaR) and Expected Annual Loss?",
            "How does our security posture align with RBI and SEBI regulations?",
            "Can an attacker reach crown jewel databases from external perimeter assets?",
        ]
    )


@router.post("/ask")
async def ask(
    payload: AdvisorAskRequest,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict[str, Any]]:
    """Ask natural language question to AI Risk Advisor with 100% grounded facts."""
    response: AdvisorResponse = await advisor_service.ask(
        question=payload.question,
        session=session,
        user=user,
        budget_override=payload.budget_override,
    )
    return DataResponse(data=response.model_dump())


@router.post("/plan")
async def plan_inquiry(
    payload: AdvisorPlanRequest,
    _user: CurrentUser,
) -> DataResponse[AdvisorPlan]:
    """Inspect the Intent & Tool execution plan formulated for a user inquiry."""
    plan = advisor_service.plan(payload.question)
    return DataResponse(data=plan)


@router.get("/history")
async def get_history(
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[list[AdvisorAuditLogRead]]:
    """Retrieve recent AI Risk Advisor audit trail entries for the organization."""
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER)(user)
    stmt = (
        select(AdvisorAuditLog)
        .where(AdvisorAuditLog.organization_id == user.organization_id)
        .order_by(AdvisorAuditLog.created_at.desc())
        .limit(25)
    )
    logs = list((await session.scalars(stmt)).all())
    return DataResponse(data=[AdvisorAuditLogRead.model_validate(log) for log in logs])


@router.get("/status")
async def advisor_status(
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict[str, Any]]:
    """Inspect AI Risk Advisor configuration, active provider, and knowledge base metrics."""
    cfg = get_ai_config()

    doc_count = await session.scalar(
        select(func.count(KnowledgeDocument.id))
    ) or 0

    query_count = await session.scalar(
        select(func.count(AdvisorAuditLog.id)).where(
            AdvisorAuditLog.organization_id == user.organization_id
        )
    ) or 0

    return DataResponse(
        data={
            "ai_enabled": cfg.ai_enabled,
            "provider": cfg.llm_provider,
            "model": cfg.openai_model if cfg.openai_api_key else "deterministic_fallback",
            "has_api_key": bool(cfg.openai_api_key),
            "rag_documents_indexed": doc_count,
            "total_advisory_queries": query_count,
            "zero_hallucination_mode": True,
            "prompt_injection_guard": True,
        }
    )


@router.post("/brief")
async def generate_brief(
    payload: AdvisorAskRequest,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[AdvisorDecisionBrief]:
    """Generate a formal Board / CISO Executive Decision Brief."""
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER, UserRole.EXECUTIVE)(user)
    brief = await advisor_service.generate_decision_brief(
        question=payload.question,
        session=session,
        user=user,
        budget_override=payload.budget_override,
    )
    return DataResponse(data=brief)


@router.post("/{audit_id}/evidence")
async def notarize_audit_record(
    audit_id: UUID,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict[str, Any]]:
    """Notarize an advisory audit log record onto the blockchain ledger."""
    require_roles(UserRole.ADMIN, UserRole.CISO)(user)
    try:
        evidence = await advisor_service.notarize_audit_record(
            audit_id=audit_id,
            session=session,
            user=user,
        )
        return DataResponse(
            data={
                "evidence_id": str(evidence.id),
                "evidence_hash": evidence.evidence_hash,
                "transaction_hash": evidence.transaction_hash,
                "verification_status": evidence.verification_status.value,
                "notarized_at": evidence.timestamp.isoformat(),
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/evidence/{evidence_id}")
async def get_evidence_details(
    evidence_id: UUID,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict[str, Any]]:
    """Fetch blockchain evidence verification record by ID."""
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER)(user)
    evidence = await session.get(BlockchainEvidence, evidence_id)
    if not evidence or evidence.organization_id != user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence record not found or access denied.",
        )

    return DataResponse(
        data={
            "id": str(evidence.id),
            "evidence_type": evidence.evidence_type,
            "evidence_hash": evidence.evidence_hash,
            "transaction_hash": evidence.transaction_hash,
            "timestamp": evidence.timestamp.isoformat(),
            "verification_status": evidence.verification_status.value,
            "network": evidence.blockchain_network,
            "notes": evidence.notes,
        }
    )
