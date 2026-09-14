from uuid import UUID

from sqlalchemy import Float, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ImplementationStatus, enum_column
from app.models.organization import Organization


class Control(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "controls"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    framework: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(128), nullable=False)
    effectiveness: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    implementation_status: Mapped[ImplementationStatus] = mapped_column(
        enum_column(ImplementationStatus),
        default=ImplementationStatus.PLANNED,
        nullable=False,
    )
    annual_cost: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    organization: Mapped[Organization] = relationship()
