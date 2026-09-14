from uuid import UUID

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON, Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MLPrediction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ml_predictions"

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("assets.id", ondelete="SET NULL"))
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    prediction_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    prediction_value: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    top_factors: Mapped[list | None] = mapped_column(JSON, default=list)
    feature_version: Mapped[str] = mapped_column(String(16), nullable=False)
    extras: Mapped[dict | None] = mapped_column(JSON, default=dict)
