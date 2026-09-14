"""Greedy budget optimizer. Replaceable with OR-Tools later."""

from dataclasses import dataclass

from app.utils.calculations import rosi


@dataclass(frozen=True)
class ControlOption:
    id: str
    name: str
    cost: float
    estimated_risk_reduction: float
    estimated_loss_avoided: float
    category: str = "control"


def optimize_portfolio(budget: float, options: list[ControlOption]) -> list[ControlOption]:
    """Maximize loss avoided under budget using density-greedy selection."""
    remaining = max(0.0, budget)
    ranked = sorted(
        options,
        key=lambda item: (item.estimated_loss_avoided / item.cost) if item.cost > 0 else item.estimated_loss_avoided,
        reverse=True,
    )
    chosen: list[ControlOption] = []
    for item in ranked:
        if item.cost <= remaining:
            chosen.append(item)
            remaining -= item.cost
    return chosen


def portfolio_summary(chosen: list[ControlOption], budget: float, baseline_risk: float) -> dict:
    investment = sum(item.cost for item in chosen)
    reduction = min(100.0, sum(item.estimated_risk_reduction for item in chosen))
    avoided = sum(item.estimated_loss_avoided for item in chosen)
    remaining_risk = max(0.0, round(baseline_risk - reduction, 2))
    utilization = round((investment / budget) * 100, 2) if budget > 0 else 0.0
    return {
        "recommended_controls": [
            {
                "id": item.id,
                "name": item.name,
                "cost": item.cost,
                "estimated_risk_reduction": item.estimated_risk_reduction,
                "estimated_loss_avoided": item.estimated_loss_avoided,
                "rosi": rosi(item.estimated_loss_avoided, item.cost),
                "category": item.category,
            }
            for item in chosen
        ],
        "total_investment": round(investment, 2),
        "expected_risk_reduction": round(reduction, 2),
        "expected_loss_avoided": round(avoided, 2),
        "remaining_risk": remaining_risk,
        "budget_utilization": utilization,
        "portfolio_rosi": rosi(avoided, investment),
        "illustrative": True,
    }
