from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON, Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import IncidentStatus, Severity, enum_column


class Incident(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "incidents"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[Severity] = mapped_column(enum_column(Severity, 16), nullable=False)
    status: Mapped[IncidentStatus] = mapped_column(
        enum_column(IncidentStatus),
        default=IncidentStatus.NEW,
        nullable=False,
    )
    detected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estimated_loss: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    affected_assets: Mapped[list[str] | None] = mapped_column(JSON, default=list)
    description: Mapped[str | None] = mapped_column(Text)
