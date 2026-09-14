from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import VerificationStatus, enum_column


class BlockchainEvidence(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "blockchain_evidence"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)
    evidence_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    blockchain_network: Mapped[str] = mapped_column(String(64), default="prototype-ledger", nullable=False)
    transaction_hash: Mapped[str | None] = mapped_column(String(128))
    verification_status: Mapped[VerificationStatus] = mapped_column(
        enum_column(VerificationStatus),
        default=VerificationStatus.RECORDED,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text)
