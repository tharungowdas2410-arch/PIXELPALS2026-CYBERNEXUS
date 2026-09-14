from pydantic import BaseModel, Field


class ScenarioSimulateRequest(BaseModel):
    changes: list[str] = Field(min_length=1)
    baseline_risk: float | None = Field(default=None, ge=0, le=100)
    baseline_eal: float | None = Field(default=None, ge=0)
    control_effectiveness: float = Field(default=0.45, ge=0, le=1)
    investment_cost: float = Field(default=0, ge=0)
    name: str | None = None
