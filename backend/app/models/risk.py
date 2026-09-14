from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON, Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import RiskStatus, enum_column


class Risk(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "risks"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("assets.id", ondelete="SET NULL"))
    vulnerability_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("vulnerabilities.id", ondelete="SET NULL"),
    )
    threat_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("threats.id", ondelete="SET NULL"))
    control_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("controls.id", ondelete="SET NULL"))
    likelihood: Mapped[float] = mapped_column(Float, nullable=False)
    impact: Mapped[float] = mapped_column(Float, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    residual_risk: Mapped[float] = mapped_column(Float, nullable=False)
    financial_exposure: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    expected_annual_loss: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    status: Mapped[RiskStatus] = mapped_column(
        enum_column(RiskStatus),
        default=RiskStatus.OPEN,
        nullable=False,
    )
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    explanation: Mapped[str | None] = mapped_column(String(2048))
    drivers: Mapped[list[str] | None] = mapped_column(JSON, default=list)
    factors: Mapped[list[dict] | None] = mapped_column(JSON, default=list)
    formula_trace: Mapped[str | None] = mapped_column(String(1024))
