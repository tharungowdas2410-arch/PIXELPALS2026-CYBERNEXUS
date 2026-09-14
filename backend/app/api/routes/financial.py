from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.enums import UserRole
from app.models.risk import Risk
from app.schemas.common import DataResponse
from app.schemas.financial import FinancialCalculateRequest, MonteCarloRequest
from app.services.financial_engine import calculate_eal, run_monte_carlo

router = APIRouter(prefix="/financial", tags=["financial"])


@router.get("/summary")
async def financial_summary(user: CurrentUser, session: DbSession) -> DataResponse[dict]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER, UserRole.EXECUTIVE)(user)
    risks = list(await session.scalars(select(Risk).where(Risk.organization_id == user.organization_id)))
    eal = round(sum(float(item.expected_annual_loss) for item in risks), 2)
    exposure = round(sum(float(item.financial_exposure) for item in risks), 2)
    return DataResponse(
        data={
            "expected_annual_loss": eal,
            "total_financial_exposure": exposure,
            "risk_count": len(risks),
            "assumptions": "Illustrative model output, not booked losses.",
            "illustrative": True,
        }
    )


@router.get("/loss-distribution")
async def loss_distribution(user: CurrentUser, session: DbSession) -> DataResponse[dict]:
    risks = list(await session.scalars(select(Risk).where(Risk.organization_id == user.organization_id)))
    eal = sum(float(item.expected_annual_loss) for item in risks) or 1.0
    exposure = sum(float(item.financial_exposure) for item in risks) or eal
    sim = run_monte_carlo(
        expected_loss=eal,
        min_loss=eal * 0.4,
        max_loss=max(exposure, eal),
        probability=0.55,
        simulations=5000,
        seed=26105,
    )
    return DataResponse(data=sim)


@router.post("/calculate")
async def calculate_financial(payload: FinancialCalculateRequest, _user: CurrentUser) -> DataResponse[dict]:
    return DataResponse(data=calculate_eal(
        likelihood=payload.likelihood,
        asset_business_value=payload.asset_business_value,
        impact=payload.impact,
    ))


@router.post("/monte-carlo")
async def monte_carlo(payload: MonteCarloRequest, _user: CurrentUser) -> DataResponse[dict]:
    return DataResponse(
        data=run_monte_carlo(
            expected_loss=payload.expected_loss,
            min_loss=payload.min_loss,
            max_loss=payload.max_loss,
            probability=payload.probability,
            simulations=payload.simulations,
            seed=payload.seed,
        )
    )
