from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.models.risk import Risk
from app.models.scenario import ScenarioRun
from app.schemas.common import DataResponse
from app.schemas.scenario import ScenarioSimulateRequest
from app.services.scenario_engine import simulate_scenario

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("")
async def list_scenarios(user: CurrentUser, session: DbSession) -> DataResponse[list]:
    rows = list(
        await session.scalars(
            select(ScenarioRun)
            .where(ScenarioRun.organization_id == user.organization_id)
            .order_by(ScenarioRun.created_at.desc())
        )
    )
    return DataResponse(
        data=[{"id": str(item.id), "name": item.name, "changes": item.changes, **(item.result or {})} for item in rows]
    )


@router.post("/simulate")
async def simulate(payload: ScenarioSimulateRequest, user: CurrentUser, session: DbSession) -> DataResponse[dict]:
    avg = await session.scalar(
        select(func.avg(Risk.residual_risk)).where(Risk.organization_id == user.organization_id)
    )
    eal = await session.scalar(
        select(func.coalesce(func.sum(Risk.expected_annual_loss), 0)).where(Risk.organization_id == user.organization_id)
    )
    baseline_risk = payload.baseline_risk if payload.baseline_risk is not None else float(avg or 72)
    baseline_eal = payload.baseline_eal if payload.baseline_eal is not None else float(eal or 0)
    result = simulate_scenario(
        baseline_risk=baseline_risk,
        baseline_eal=baseline_eal,
        control_effectiveness=payload.control_effectiveness,
        investment_cost=payload.investment_cost,
        changes=payload.changes,
    )
    name = payload.name or " + ".join(payload.changes)[:120]
    run = ScenarioRun(organization_id=user.organization_id, name=name, changes=payload.changes, result=result)
    session.add(run)
    await session.commit()
    await session.refresh(run)
    return DataResponse(data={"id": str(run.id), "name": run.name, **result})
