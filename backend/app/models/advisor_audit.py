"""Advisor audit trail and decision tracking models."""

from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON, Uuid

from app.models.base import Base, UUIDPrimaryKeyMixin


class AdvisorAuditLog(Base, UUIDPrimaryKeyMixin):
    """Audit log of AI Risk Advisor questions, tool calls, and grounded answers."""

    __tablename__ = "advisor_audit_logs"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    selected_tools: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    tool_arguments: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    tool_results_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendations: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    financial_impact: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    evidence: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    assumptions: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    confidence: Mapped[str] = mapped_column(String(16), nullable=False, default="HIGH")
    model: Mapped[str] = mapped_column(String(64), nullable=False, default="fallback")
    model_version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0.0")
    prompt_version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0.0")
    blockchain_evidence_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
