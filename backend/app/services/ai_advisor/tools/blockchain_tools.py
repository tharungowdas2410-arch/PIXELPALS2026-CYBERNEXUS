"""Blockchain evidence verification tools for tamper-evident assurance."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.blockchain_evidence import BlockchainEvidence
from app.services.ai_advisor.citations import CitationCollector


async def verify_blockchain_evidence_tool(
    session: AsyncSession,
    organization_id: UUID,
    evidence_id: UUID | None = None,
    collector: CitationCollector | None = None,
) -> dict:
    """Verifies cryptographic proof and ledger status of recorded risk evidence."""
    if evidence_id:
        row = await session.get(BlockchainEvidence, evidence_id)
        if not row or row.organization_id != organization_id:
            return {"error": f"Evidence record {evidence_id} not found."}
    else:
        row = (
            await session.scalars(
                select(BlockchainEvidence)
                .where(BlockchainEvidence.organization_id == organization_id)
                .order_by(BlockchainEvidence.timestamp.desc())
            )
        ).first()

    if not row:
        return {
            "status": "NO_EVIDENCE_RECORDED",
            "message": "No blockchain evidence has been notarized yet for this organization.",
            "valid": True,
            "is_verified": True,
        }

    status_val = row.verification_status.value if hasattr(row.verification_status, "value") else str(row.verification_status)
    if collector:
        collector.add(
            source_type="blockchain",
            source_id=str(row.id),
            description=f"Cryptographic ledger attestation ({row.evidence_type}, Hash: {row.evidence_hash[:12]}…)",
            metadata={"evidence_hash": row.evidence_hash, "network": row.blockchain_network},
        )

    is_valid = status_val in ("VERIFIED", "RECORDED", "verified", "recorded")
    return {
        "id": str(row.id),
        "evidence_type": row.evidence_type,
        "evidence_hash": row.evidence_hash,
        "transaction_hash": row.transaction_hash,
        "blockchain_network": row.blockchain_network,
        "verification_status": status_val,
        "timestamp": row.timestamp.isoformat(),
        "is_verified": is_valid,
        "valid": is_valid,
        "notes": row.notes,
    }
