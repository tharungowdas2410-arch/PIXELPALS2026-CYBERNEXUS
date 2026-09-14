from uuid import UUID

from sqlalchemy import Boolean, Float, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Investment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "investments"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    control_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("controls.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False)
    cost: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    estimated_risk_reduction: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    estimated_loss_avoided: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    rosi: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=99, nullable=False)
    recommended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
