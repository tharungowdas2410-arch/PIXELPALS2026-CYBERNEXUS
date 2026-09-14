from pydantic import BaseModel, Field


class FinancialCalculateRequest(BaseModel):
    likelihood: float = Field(ge=0, le=1)
    impact: float = Field(ge=0, le=1)
    asset_business_value: float = Field(ge=0)


class MonteCarloRequest(BaseModel):
    expected_loss: float = Field(ge=0)
    min_loss: float = Field(ge=0)
    max_loss: float = Field(ge=0)
    probability: float = Field(ge=0, le=1)
    simulations: int = Field(default=10_000, ge=1, le=50_000)
    seed: int | None = None
