"""What-if scenario simulation tool for AI Risk Advisor."""

from app.services.ai_advisor.citations import CitationCollector
from app.services.scenario_engine import simulate_scenario


def simulate_scenario_tool(
    scenario_type: str = "mfa",
    baseline_risk: float = 78.0,
    baseline_eal: float = 21_400_000.0,
    parameters: dict | None = None,
    collector: CitationCollector | None = None,
) -> dict:
    """Simulates the risk and financial impact of security changes (MFA, Patching, EDR, Backups)."""
    st = scenario_type.lower()
    params = parameters or {}

    if "mfa" in st or "identity" in st:
        effectiveness = params.get("effectiveness", 0.35)
        cost = params.get("cost", 12_00_000.0)
        changes = ["Enforce Privileged MFA across VPN and IdP"]
    elif "patch" in st or "cve" in st or "vuln" in st:
        effectiveness = params.get("effectiveness", 0.30)
        cost = params.get("cost", 7_50_000.0)
        changes = ["Remediate all Critical & High CVSS > 9.0 CVEs"]
    elif "edr" in st or "endpoint" in st:
        effectiveness = params.get("effectiveness", 0.28)
        cost = params.get("cost", 18_00_000.0)
        changes = ["Expand EDR coverage to 100% of servers"]
    elif "backup" in st:
        effectiveness = params.get("effectiveness", 0.20)
        cost = params.get("cost", 9_00_000.0)
        changes = ["Deploy immutable isolated backup storage"]
    elif "segmentation" in st or "network" in st:
        effectiveness = params.get("effectiveness", 0.32)
        cost = params.get("cost", 15_00_000.0)
        changes = ["Implement Zero Trust network micro-segmentation"]
    else:
        effectiveness = params.get("effectiveness", 0.25)
        cost = params.get("cost", 10_00_000.0)
        changes = [f"Apply scenario controls: {scenario_type}"]

    result = simulate_scenario(
        baseline_risk=baseline_risk,
        baseline_eal=baseline_eal,
        control_effectiveness=effectiveness,
        investment_cost=cost,
        changes=changes,
    )

    if collector:
        collector.add(
            source_type="scenario",
            source_id=f"scenario_{st[:12]}",
            description=f"What-if scenario '{changes[0]}' (Risk: {baseline_risk} -> {result['scenario_risk']}, Loss Avoided: ₹{result['financial_loss_avoided']:,.0f})",
            metadata={"scenario_risk": result["scenario_risk"], "loss_avoided": result["financial_loss_avoided"]},
        )

    return result
