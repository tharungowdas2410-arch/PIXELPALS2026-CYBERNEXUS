from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, computed_field

from app.models.enums import RiskLevel, RiskStatus
from app.schemas.common import ORMModel
from app.utils.calculations import FORMULAS, risk_level


class RiskCalculateRequest(BaseModel):
    asset_id: UUID
    vulnerability_id: UUID | None = None
    threat_id: UUID | None = None
    control_id: UUID | None = None
    likelihood: float = Field(ge=0, le=1)
    impact: float = Field(ge=0, le=1)


class RiskFactorRead(BaseModel):
    key: str
    label: str
    value: float | int | str | None = None
    normalized: float
    source: str
    explanation: str


class RiskRead(ORMModel):
    id: UUID
    organization_id: UUID
    asset_id: UUID | None
    vulnerability_id: UUID | None
    threat_id: UUID | None
    control_id: UUID | None
    likelihood: float
    impact: float
    risk_score: float
    residual_risk: float
    financial_exposure: float
    expected_annual_loss: float
    status: RiskStatus
    calculated_at: datetime
    explanation: str | None
    drivers: list[str] | None = None
    factors: list[dict[str, Any]] | None = None
    formula_trace: str | None = None

    @computed_field
    @property
    def inherent_risk(self) -> float:
        return self.risk_score

    @computed_field
    @property
    def risk_level(self) -> RiskLevel:
        return risk_level(self.residual_risk)


class RiskChainRead(BaseModel):
    organization_id: UUID
    asset: dict[str, Any] | None = None
    vulnerability: dict[str, Any] | None = None
    threat: dict[str, Any] | None = None
    control: dict[str, Any] | None = None


class RiskDetailRead(RiskRead):
    chain: RiskChainRead | None = None
    formulas: dict[str, str] = Field(default_factory=lambda: dict(FORMULAS))


class RiskCalculateResponse(BaseModel):
    risk_score: float
    residual_risk: float
    inherent_risk: float
    risk_level: RiskLevel
    drivers: list[str]
    contributing_factors: list[str]
    factors: list[RiskFactorRead]
    formula_trace: str
    applied_control_effectiveness: float
    formulas: dict[str, str] = Field(default_factory=lambda: dict(FORMULAS))
    explanation: str
    expected_annual_loss: float
    financial_exposure: float
    chain: RiskChainRead | None = None
    illustrative: bool = True
    persisted: RiskRead | None = None
