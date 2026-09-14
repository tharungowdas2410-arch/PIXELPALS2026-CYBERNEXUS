from uuid import UUID

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AssetType, enum_column
from app.models.organization import Organization


class Asset(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "assets"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_type: Mapped[AssetType] = mapped_column(enum_column(AssetType), nullable=False)
    owner: Mapped[str | None] = mapped_column(String(255))
    environment: Mapped[str | None] = mapped_column(String(64), index=True)
    criticality: Mapped[int] = mapped_column(Integer, nullable=False)
    business_value: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    exposure: Mapped[str | None] = mapped_column(String(64))
    data_sensitivity: Mapped[str | None] = mapped_column(String(64))
    availability_requirement: Mapped[str | None] = mapped_column(String(32))
    integrity_requirement: Mapped[str | None] = mapped_column(String(32))
    confidentiality_requirement: Mapped[str | None] = mapped_column(String(32))
    description: Mapped[str | None] = mapped_column(Text)

    organization: Mapped[Organization] = relationship(back_populates="assets")
    vulnerabilities: Mapped[list["Vulnerability"]] = relationship(  # noqa: F821
        back_populates="asset",
        cascade="all, delete-orphan",
    )
