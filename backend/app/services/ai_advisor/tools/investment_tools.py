"""Investment optimization and portfolio comparison tools."""

from app.services.advanced_investment_optimizer import (
    InvestmentOptimizationService,
    OptimizationConstraints,
    demo_candidates,
)
from app.services.ai_advisor.citations import CitationCollector

_optimizer = InvestmentOptimizationService()


def optimize_investment(
    budget: float = 50_00_000.0,
    objective: str = "BALANCED",
    time_horizon_months: int = 12,
    max_projects: int | None = 5,
    baseline_risk: float = 78.0,
    baseline_eal: float = 21_400_000.0,
    collector: CitationCollector | None = None,
) -> dict:
    """Executes the Phase 9 constraint-based investment optimizer using OR-Tools."""
    candidates = demo_candidates()
    constraints = OptimizationConstraints(
        budget=max(0.0, budget),
        objective=objective,  # type: ignore
        time_horizon_months=max(1, time_horizon_months),
        max_projects=max_projects,
    )
    result = _optimizer.optimize(
        candidates,
        baseline_risk=baseline_risk,
        baseline_eal=baseline_eal,
        constraints=constraints,
    )

    if collector:
        collector.add(
            source_type="optimizer",
            source_id=result.decision_payload_hash[:16],
            description=(
                f"OR-Tools investment portfolio (Budget ₹{budget:,.0f} -> Investment ₹{result.total_investment:,.0f}, "
                f"Risk {result.baseline_risk} -> {result.optimized_risk}, ROSI {result.rosi:.1f}%)"
            ),
            metadata={
                "total_investment": result.total_investment,
                "loss_avoided": result.loss_avoided,
                "rosi": result.rosi,
                "method": result.optimization_method,
            },
        )

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
        "optimization_method": result.optimization_method,
        "total_cost": result.total_investment,
        "expected_loss_avoided": result.loss_avoided,
        "expected_risk_reduction_pct": result.risk_reduction,
        "portfolio_rosi": result.rosi,
        "selected_investments": [
            {
                "id": s.id,
                "name": s.name,
                "title": s.name,
                "category": s.category,
                "cost": s.cost,
                "risk_reduction": s.risk_reduction,
                "risk_reduction_pct": s.risk_reduction,
                "loss_avoided": s.loss_avoided,
                "rosi": s.rosi,
                "priority": s.priority,
                "reason": s.reason,
                "affected_attack_paths": s.affected_attack_paths,
                "implementation_time": s.implementation_time,
            }
            for s in result.selected_investments
        ],
        "decision_payload_hash": result.decision_payload_hash,
        "illustrative": True,
    }


def compare_investments(
    investment_ids: list[str] | None = None,
    budget: float = 50_00_000.0,
    collector: CitationCollector | None = None,
) -> dict:
    """Compares individual security investments on cost, risk reduction, loss avoided, and ROSI."""
    candidates = demo_candidates()
    cand_map = {c.id: c for c in candidates}
    ids = investment_ids or ["inv_mfa", "inv_cve", "inv_edr", "inv_segmentation"]
    items = []
    for iid in ids:
        c = cand_map.get(iid)
        if c:
            items.append({
                "id": c.id,
                "name": c.name,
                "category": c.category,
                "cost": c.cost,
                "risk_reduction": c.risk_reduction,
                "loss_avoided": c.loss_avoided,
                "rosi": c.rosi_value,
                "implementation_time_months": c.implementation_time_months,
                "affected_assets": c.affected_asset_ids,
                "affected_attack_paths": c.affected_attack_path_ids,
            })
    return {"investments": items, "budget_context": budget}
