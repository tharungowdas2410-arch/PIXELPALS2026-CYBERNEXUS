from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.control import Control
from app.models.enums import UserRole
from app.models.investment import Investment
from app.schemas.common import DataResponse, PaginatedResponse
from app.services.audit_service import AuditService
from app.schemas.investment import (
    AdvancedOptimizeRequest,
    CompareRequest,
    CompareScenario,
    InvestmentDetailItem,
    InvestmentRead,
    OptimizeRequest,
)
from app.services.advanced_investment_optimizer import (
    InvestmentCandidate,
    InvestmentOptimizationService,
    OptimizationConstraints,
    demo_candidates,
)
from app.services.investment_optimizer import ControlOption, optimize_portfolio, portfolio_summary
from app.utils.calculations import rosi

router = APIRouter(prefix="/investments", tags=["investments"])

_optimizer = InvestmentOptimizationService()


def _option_from_control(control: Control) -> ControlOption:
    cost = float(control.annual_cost)
    avoided = round(cost * (1.2 + control.effectiveness), 2)
    return ControlOption(
        id=str(control.id),
        name=control.name,
        cost=cost,
        estimated_risk_reduction=round(control.effectiveness * 25, 2),
        estimated_loss_avoided=avoided,
        category=control.category,
    )


def _candidates_from_controls(controls: list[Control], payload: AdvancedOptimizeRequest) -> list[InvestmentCandidate]:
    """Map Controls + baseline risk to InvestmentCandidates.

    Uses risk engine formulas to derive risk_reduction and loss_avoided
    instead of arbitrary random values.
    """
    baseline_risk = max(0.0, min(100.0, payload.baseline_risk))
    baseline_eal = payload.baseline_eal if payload.baseline_eal and payload.baseline_eal > 0 else baseline_risk * 3_00_000
    candidates: list[InvestmentCandidate] = []
    for idx, ctl in enumerate(controls):
        crit = max(1, min(5, 3 + idx % 3))
        raw_reduction = float(ctl.effectiveness) * (22 + 4 * (crit / 5.0))
        base_loss = max(5_00_000.0, crit * baseline_eal * 0.18)
        avoided = base_loss * (0.5 + 0.8 * float(ctl.effectiveness))
        candidates.append(InvestmentCandidate(
            id=str(ctl.id),
            name=ctl.name,
            category=ctl.category or "control",
            cost=max(1_00_000.0, float(ctl.annual_cost) * (0.8 + 0.01 * idx)),
            risk_reduction=round(raw_reduction, 2),
            loss_avoided=round(avoided, 2),
            implementation_time_months=max(1, min(6, 1 + idx % 4)),
            annual_operating_cost=round(float(ctl.annual_cost) * 0.12, 2),
            dependencies=[],
            affected_asset_ids=[],
            affected_asset_criticality=[crit],
            affected_attack_path_ids=[],
            affected_attack_path_risk=[],
            control_effectiveness_gain=float(ctl.effectiveness),
            critical_asset_weight=(crit / 3.0),
        ))
    return candidates


@router.get("", response_model=PaginatedResponse[InvestmentRead])
async def list_investments(user: CurrentUser, session: DbSession) -> PaginatedResponse[InvestmentRead]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER, UserRole.EXECUTIVE)(user)
    rows = list(
        await session.scalars(
            select(Investment).where(Investment.organization_id == user.organization_id).order_by(Investment.priority)
        )
    )
    return PaginatedResponse(data=[InvestmentRead.model_validate(row) for row in rows], total=len(rows), page=1, page_size=len(rows) or 20)


@router.get("/recommendations")
async def recommendations(user: CurrentUser, session: DbSession) -> DataResponse[dict]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER, UserRole.EXECUTIVE)(user)
    rows = list(
        await session.scalars(
            select(Investment).where(
                Investment.organization_id == user.organization_id,
                Investment.recommended.is_(True),
            )
        )
    )
    return DataResponse(data={"items": [InvestmentRead.model_validate(row).model_dump(mode="json") for row in rows]})


@router.get("/catalog")
async def investment_catalog(user: CurrentUser, session: DbSession) -> DataResponse[dict]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER, UserRole.EXECUTIVE)(user)
    demo = demo_candidates()
    data = []
    for c in demo:
        reason_parts = []
        if c.affected_attack_path_ids:
            reason_parts.append(f"Covers {len(c.affected_attack_path_ids)} attack path(s)")
        if c.control_effectiveness_gain:
            reason_parts.append(f"+{c.control_effectiveness_gain*100:.0f}% control effectiveness")
        if c.critical_asset_weight > 1.3:
            reason_parts.append("Protects critical assets")
        data.append({
            "id": c.id,
            "name": c.name,
            "category": c.category,
            "cost": c.cost,
            "risk_reduction": c.risk_reduction,
            "loss_avoided": c.loss_avoided,
            "rosi": c.rosi_value if c.rosi_value else None,
            "implementation_time_months": c.implementation_time_months,
            "annual_operating_cost": c.annual_operating_cost,
            "dependencies": c.dependencies,
            "mutually_exclusive_group": c.mutually_exclusive_group,
            "affected_assets": c.affected_asset_ids,
            "affected_asset_criticality": c.affected_asset_criticality,
            "affected_attack_paths": c.affected_attack_path_ids,
            "control_effectiveness_gain": c.control_effectiveness_gain,
            "critical_asset_weight": c.critical_asset_weight,
            "reason": "; ".join(reason_parts) or "Baseline security control",
        })
    return DataResponse(data={"items": data, "count": len(data)})


@router.get("/risk-reduction-curve")
async def risk_reduction_curve(
    user: CurrentUser,
    objective: str = "BALANCED",
    time_horizon_months: int = 12,
    max_projects: int | None = None,
) -> DataResponse[dict]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER, UserRole.EXECUTIVE)(user)
    if objective not in ("MAX_RISK_REDUCTION", "MAX_LOSS_AVOIDED", "MAX_ROSI", "BALANCED"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid objective")
    if not (1 <= time_horizon_months <= 120):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid time_horizon_months")
    candidates = demo_candidates()
    constraints = OptimizationConstraints(
        budget=1_00_00_00_000,
        objective=objective,
        time_horizon_months=time_horizon_months,
        max_projects=max_projects,
    )
    curve = _optimizer.calculate_risk_reduction_curve(
        candidates,
        baseline_risk=78.0,
        baseline_eal=2_14_00_000,
        constraints=constraints,
    )
    return DataResponse(data={"points": curve, "illustrative": True})


@router.get("/{investment_id}")
async def get_investment_detail(investment_id: str, user: CurrentUser) -> DataResponse[dict]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER, UserRole.EXECUTIVE)(user)
    demo = {c.id: c for c in demo_candidates()}
    if investment_id not in demo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Investment not found")
    c = demo[investment_id]
    return DataResponse(data={
        "id": c.id,
        "name": c.name,
        "category": c.category,
        "cost": c.cost,
        "risk_reduction": c.risk_reduction,
        "loss_avoided": c.loss_avoided,
        "rosi": c.rosi_value if c.rosi_value else None,
        "implementation_time_months": c.implementation_time_months,
        "annual_operating_cost": c.annual_operating_cost,
        "dependencies": c.dependencies,
        "mutually_exclusive_group": c.mutually_exclusive_group,
        "affected_assets": c.affected_asset_ids,
        "affected_asset_criticality": c.affected_asset_criticality,
        "affected_attack_paths": c.affected_attack_path_ids,
        "affected_attack_path_risk": c.affected_attack_path_risk,
        "control_effectiveness_gain": c.control_effectiveness_gain,
        "critical_asset_weight": c.critical_asset_weight,
        "risk_impact": {
            "baseline_risk": 78.0,
            "estimated_residual_risk": round(max(0.0, 78.0 - c.risk_reduction), 2),
            "marginal_value_per_lakh": round(c.risk_reduction / max(1.0, c.cost / 1_00_000), 2),
        },
        "financial_impact": {
            "baseline_eal": 2_14_00_000,
            "estimated_eal": round(max(0.0, 2_14_00_000 - c.loss_avoided), 2),
            "expected_loss_avoided": c.loss_avoided,
        },
        "implementation_details": {
            "implementation_time_months": c.implementation_time_months,
            "annual_operating_cost": c.annual_operating_cost,
            "dependencies": c.dependencies,
            "mutually_exclusive_group": c.mutually_exclusive_group,
        },
        "illustrative": True,
    })


@router.post("/compare")
async def compare_portfolios(payload: CompareRequest, user: CurrentUser) -> DataResponse[dict]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER, UserRole.EXECUTIVE)(user)
    candidates = demo_candidates()
    baseline_eal = payload.baseline_eal if payload.baseline_eal and payload.baseline_eal > 0 else payload.baseline_risk * 3_00_000
    scenarios = [
        OptimizationConstraints(
            budget=sc.budget,
            objective=sc.objective,
            time_horizon_months=sc.time_horizon_months,
            max_projects=sc.max_projects,
        )
        for sc in payload.scenarios
    ]
    comparison = _optimizer.compare_portfolios(
        candidates,
        baseline_risk=payload.baseline_risk,
        baseline_eal=baseline_eal,
        scenarios=scenarios,
    )
    return DataResponse(data={"comparison": comparison, "illustrative": True})


async def _execute_optimization(
    payload: OptimizeRequest, user: CurrentUser, session: DbSession
) -> dict:
    candidates = demo_candidates()
    if payload.control_ids:
        controls = list(await session.scalars(
            select(Control).where(
                Control.organization_id == user.organization_id,
                Control.id.in_(payload.control_ids),
            )
        ))
        if controls:
            candidates = _candidates_from_controls(controls, payload)

    baseline_eal = (
        payload.baseline_eal
        if payload.baseline_eal and payload.baseline_eal > 0
        else payload.baseline_risk * 3_00_000
    )
    constraints = OptimizationConstraints(
        budget=payload.budget,
        objective=payload.objective,
        time_horizon_months=payload.time_horizon_months,
        max_projects=payload.max_projects,
        custom_weights=payload.custom_weights,
    )
    try:
        result = _optimizer.optimize(
            candidates,
            baseline_risk=payload.baseline_risk,
            baseline_eal=baseline_eal,
            constraints=constraints,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    existing = list(await session.scalars(select(Investment).where(Investment.organization_id == user.organization_id)))
    by_name = {row.name: row for row in existing}
    for index, sel in enumerate(result.selected_investments, start=1):
        row = by_name.get(sel.name)
        if row is None:
            row = Investment(
                organization_id=user.organization_id,
                control_id=None,
                name=sel.name,
                category=sel.category,
            )
            session.add(row)
        row.cost = sel.cost
        row.estimated_risk_reduction = sel.risk_reduction
        row.estimated_loss_avoided = sel.loss_avoided
        row.rosi = sel.rosi or 0
        row.priority = index
        row.recommended = True
    for row in existing:
        if row.name not in {s.name for s in result.selected_investments}:
            row.recommended = False
    await session.commit()

    selected_list = [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "cost": s.cost,
            "risk_reduction": s.risk_reduction,
            "loss_avoided": s.loss_avoided,
            "rosi": s.rosi,
            "affected_assets": s.affected_assets,
            "affected_attack_paths": s.affected_attack_paths,
            "implementation_time": s.implementation_time,
            "priority": s.priority,
            "reason": s.reason,
            "marginal_value_per_lakh": s.marginal_value,
        }
        for s in result.selected_investments
    ]

    return {
        "budget": result.budget,
        "total_investment": result.total_investment,
        "remaining_budget": result.remaining_budget,
        "baseline_risk": result.baseline_risk,
        "optimized_risk": result.optimized_risk,
        "risk_reduction": result.risk_reduction,
        "baseline_eal": result.baseline_eal,
        "optimized_eal": result.optimized_eal,
        "loss_avoided": result.loss_avoided,
        "rosi": result.rosi,
        "budget_utilization": result.budget_utilization,
        "selected_investments": selected_list,
        "optimization_method": result.optimization_method,
        "objective": result.objective,
        "constraints": result.constraints,
        "model_version": result.model_version,
        "timestamp": result.timestamp,
        "decision_payload_hash": result.decision_payload_hash,
        "illustrative": True,
        # Legacy compatibility for tests and older clients
        "recommended_controls": [
            {
                "id": s["id"],
                "name": s["name"],
                "cost": s["cost"],
                "estimated_risk_reduction": s["risk_reduction"],
                "estimated_loss_avoided": s["loss_avoided"],
                "rosi": s["rosi"],
                "category": s["category"],
            }
            for s in selected_list
        ],
        "portfolio_rosi": result.rosi,
        "expected_risk_reduction": result.risk_reduction,
        "expected_loss_avoided": result.loss_avoided,
        "remaining_risk": result.optimized_risk,
    }


@router.post("/optimize")
async def optimize(
    payload: OptimizeRequest,
    user: CurrentUser,
    session: DbSession,
    request: Request,
) -> DataResponse[dict]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER)(user)
    data = await _execute_optimization(payload, user, session)
    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="OPTIMIZE_INVESTMENTS",
        entity_type="InvestmentPortfolio",
        entity_id=data.get("decision_payload_hash") or "portfolio",
        result="SUCCESS",
        details={"budget": payload.budget, "objective": payload.objective},
        request=request,
    )
    return DataResponse(data=data)


@router.post("/optimize/advanced")
async def optimize_advanced(
    payload: AdvancedOptimizeRequest,
    user: CurrentUser,
    session: DbSession,
    request: Request,
) -> DataResponse[dict]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER)(user)
    data = await _execute_optimization(payload, user, session)
    await AuditService.log_action(
        session=session,
        organization_id=user.organization_id,
        user_id=user.id,
        action="OPTIMIZE_INVESTMENTS_ADVANCED",
        entity_type="InvestmentPortfolio",
        entity_id=data.get("decision_payload_hash") or "portfolio",
        result="SUCCESS",
        details={"budget": payload.budget, "objective": payload.objective},
        request=request,
    )
    return DataResponse(data=data)
