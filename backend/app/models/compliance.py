from uuid import UUID

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ComplianceStatus, enum_column


class ComplianceRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "compliance_records"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    framework: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    control_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("controls.id", ondelete="SET NULL"))
    requirement: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[ComplianceStatus] = mapped_column(
        enum_column(ComplianceStatus),
        default=ComplianceStatus.NOT_ASSESSED,
        nullable=False,
    )
    evidence: Mapped[str | None] = mapped_column(Text)
    score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
