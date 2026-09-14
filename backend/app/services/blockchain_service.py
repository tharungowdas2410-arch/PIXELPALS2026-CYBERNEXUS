"""Tamper-evident evidence abstraction. No public chain is connected."""

import hashlib
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.blockchain_evidence import BlockchainEvidence
from app.models.enums import VerificationStatus


def hash_payload(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def simulate_transaction_hash(evidence_hash: str) -> str:
    material = f"prototype:{evidence_hash}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


async def record_evidence(
    session: AsyncSession,
    *,
    organization_id: UUID,
    evidence_type: str,
    entity_id: UUID,
    payload: str,
) -> BlockchainEvidence:
    evidence_hash = hash_payload(payload)
    row = BlockchainEvidence(
        organization_id=organization_id,
        evidence_type=evidence_type,
        entity_id=entity_id,
        evidence_hash=evidence_hash,
        timestamp=datetime.now(UTC),
        blockchain_network="prototype-ledger",
        transaction_hash=simulate_transaction_hash(evidence_hash),
        verification_status=VerificationStatus.RECORDED,
        notes="SHA-256 prototype ledger. Not written to a public chain.",
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


def verify_evidence(payload: str, evidence_hash: str) -> bool:
    return hash_payload(payload) == evidence_hash


async def get_evidence(session: AsyncSession, organization_id: UUID, evidence_id: UUID) -> BlockchainEvidence | None:
    row = await session.get(BlockchainEvidence, evidence_id)
    if row is None or row.organization_id != organization_id:
        return None
    return row


async def list_evidence(session: AsyncSession, organization_id: UUID) -> list[BlockchainEvidence]:
    result = await session.scalars(
        select(BlockchainEvidence)
        .where(BlockchainEvidence.organization_id == organization_id)
        .order_by(BlockchainEvidence.timestamp.desc())
    )
    return list(result)
