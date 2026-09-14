"""Registry export of all structured AI Risk Advisor tools."""

from app.services.ai_advisor.tools.asset_tools import get_asset_details
from app.services.ai_advisor.tools.attack_path_tools import get_attack_paths, get_blast_radius
from app.services.ai_advisor.tools.blockchain_tools import verify_blockchain_evidence_tool
from app.services.ai_advisor.tools.compliance_tools import get_compliance_summary_tool
from app.services.ai_advisor.tools.dashboard_tools import get_dashboard_summary
from app.services.ai_advisor.tools.financial_tools import calculate_financial_risk, run_monte_carlo_tool
from app.services.ai_advisor.tools.investment_tools import compare_investments, optimize_investment
from app.services.ai_advisor.tools.ml_tools import get_ml_risk_signals_tool
from app.services.ai_advisor.tools.risk_tools import get_risk_details, list_top_risks
from app.services.ai_advisor.tools.scenario_tools import simulate_scenario_tool
from app.services.ai_advisor.tools.telemetry_tools import (
    get_continuous_risk_drift_tool,
    get_recent_telemetry_events,
)

__all__ = [
    "calculate_financial_risk",
    "compare_investments",
    "get_asset_details",
    "get_attack_paths",
    "get_blast_radius",
    "get_compliance_summary_tool",
    "get_continuous_risk_drift_tool",
    "get_dashboard_summary",
    "get_ml_risk_signals_tool",
    "get_recent_telemetry_events",
    "get_risk_details",
    "list_top_risks",
    "optimize_investment",
    "run_monte_carlo_tool",
    "simulate_scenario_tool",
    "verify_blockchain_evidence_tool",
]
