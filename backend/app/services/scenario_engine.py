"""What-if scenario comparison."""

from app.utils.calculations import residual_risk, rosi


def simulate_scenario(
    *,
    baseline_risk: float,
    baseline_eal: float,
    control_effectiveness: float,
    investment_cost: float,
    changes: list[str],
) -> dict:
    scenario_risk = residual_risk(baseline_risk, control_effectiveness)
    reduction = max(0.0, round(baseline_risk - scenario_risk, 2))
    ratio = scenario_risk / baseline_risk if baseline_risk else 1.0
    scenario_eal = round(baseline_eal * ratio, 2)
    avoided = max(0.0, round(baseline_eal - scenario_eal, 2))
    return {
        "baseline_risk": baseline_risk,
        "scenario_risk": scenario_risk,
        "risk_reduction": reduction,
        "baseline_eal": baseline_eal,
        "scenario_eal": scenario_eal,
        "financial_loss_avoided": avoided,
        "investment_cost": investment_cost,
        "rosi": rosi(avoided, investment_cost),
        "changes": changes,
        "illustrative": True,
        "assumptions": "Prototype control-uplift model. Not a forecast of incidents.",
    }
