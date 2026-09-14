from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel

OBJECTIVE_KINDS = ("MAX_RISK_REDUCTION", "MAX_LOSS_AVOIDED", "MAX_ROSI", "BALANCED")
TIME_HORIZONS = (3, 6, 12, 24, 36)


class OptimizeRequest(BaseModel):
    budget: float = Field(ge=0, le=50_00_00_000, description="Total available budget in INR")
    objective: Literal["MAX_RISK_REDUCTION", "MAX_LOSS_AVOIDED", "MAX_ROSI", "BALANCED"] = "BALANCED"
    time_horizon_months: int = Field(ge=1, le=120, default=12)
    max_projects: int | None = Field(default=None, ge=1, le=100)
    baseline_risk: float = Field(default=78, ge=0, le=100)
    baseline_eal: float | None = Field(default=None, ge=0)
    custom_weights: dict[str, float] | None = Field(default=None)
    control_ids: list[UUID] | None = None

    @field_validator("custom_weights")
    @classmethod
    def _weights(cls, v: dict[str, float] | None) -> dict[str, float] | None:
        if v is None:
            return v
        allowed = {"risk_reduction", "loss_avoided", "rosi"}
        return {k: max(0.0, float(vv)) for k, vv in v.items() if k in allowed} or None


AdvancedOptimizeRequest = OptimizeRequest


class CompareScenario(BaseModel):
    budget: float = Field(ge=0, le=50_00_00_000)
    objective: Literal["MAX_RISK_REDUCTION", "MAX_LOSS_AVOIDED", "MAX_ROSI", "BALANCED"] = "BALANCED"
    time_horizon_months: int = Field(ge=1, le=120, default=12)
    max_projects: int | None = Field(default=None, ge=1, le=100)


class CompareRequest(BaseModel):
    scenarios: list[CompareScenario] = Field(..., min_length=2, max_length=8)
    baseline_risk: float = Field(default=72, ge=0, le=100)
    baseline_eal: float | None = Field(default=None, ge=0)


class InvestmentDetailItem(BaseModel):
    id: str
    name: str
    category: str
    cost: float
    risk_reduction: float
    loss_avoided: float
    rosi: float | None
    implementation_time_months: int
    annual_operating_cost: float
    dependencies: list[str]
    mutually_exclusive_group: str | None
    affected_assets: list[str]
    affected_asset_criticality: list[int]
    affected_attack_paths: list[str]
    control_effectiveness_gain: float
    critical_asset_weight: float
    reason: str


class InvestmentRead(ORMModel):
    id: UUID
    organization_id: UUID
    control_id: UUID | None
    name: str
    category: str
    cost: float
    estimated_risk_reduction: float
    estimated_loss_avoided: float
    rosi: float | None
    priority: int
    recommended: bool
    created_at: datetime
