from uuid import UUID

from pydantic import BaseModel, Field


class IncidentPredictRequest(BaseModel):
    asset_id: UUID
    vulnerability_ids: list[UUID] | None = None
    threat_ids: list[UUID] | None = None


class RiskForecastRequest(BaseModel):
    asset_id: UUID | None = None
    history: list[float] | None = Field(default=None, description="Optional residual-risk series; skips DB history.")
