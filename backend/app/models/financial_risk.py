from uuid import UUID

from sqlalchemy import Float, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FinancialRisk(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "financial_risks"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    risk_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("risks.id", ondelete="SET NULL"))
    expected_loss: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    min_loss: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    max_loss: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    confidence_level: Mapped[float] = mapped_column(Float, default=0.95, nullable=False)
    var_value: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    annualized_loss: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    calculation_method: Mapped[str] = mapped_column(String(64), default="illustrative_eal", nullable=False)
