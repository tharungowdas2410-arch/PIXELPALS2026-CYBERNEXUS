"""Central registry of registered AI Risk Advisor tools."""

from dataclasses import dataclass
from typing import Any, Callable

from app.services.ai_advisor.tools import (
    calculate_financial_risk,
    compare_investments,
    get_asset_details,
    get_attack_paths,
    get_blast_radius,
    get_compliance_summary_tool,
    get_continuous_risk_drift_tool,
    get_dashboard_summary,
    get_ml_risk_signals_tool,
    get_recent_telemetry_events,
    get_risk_details,
    list_top_risks,
    optimize_investment,
    run_monte_carlo_tool,
    simulate_scenario_tool,
    verify_blockchain_evidence_tool,
)


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any]
    permission: str = "READ_ONLY"
    requires_session: bool = True
    handler: Callable = None  # type: ignore


class ToolRegistry:
    """Manages tool registration, metadata, and parameter validation."""

    def __init__(self) -> None:
        self._tools: dict[str, ToolDefinition] = {}
        self._register_default_tools()

    def register(self, tool: ToolDefinition) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> ToolDefinition | None:
        return self._tools.get(name)

    def list_all(self) -> list[ToolDefinition]:
        return list(self._tools.values())

    list_tools = list_all

    def get_schemas(self) -> list[dict[str, Any]]:
        return [
            {
                "name": t.name,
                "description": t.description,
                "parameters": t.parameters,
                "permission": t.permission,
            }
            for t in self._tools.values()
        ]

    def _register_default_tools(self) -> None:
        self.register(ToolDefinition(
            name="get_dashboard_summary",
            description="Returns overall enterprise risk score, total exposure, EAL, critical assets, active risks, and investment opportunity.",
            parameters={"type": "object", "properties": {}},
            requires_session=True,
            handler=get_dashboard_summary,
        ))

        self.register(ToolDefinition(
            name="list_top_risks",
            description="Lists prioritized residual risks with financial exposure, EAL, and asset details.",
            parameters={
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 5, "description": "Number of risks to return (max 20)"},
                    "severity": {"type": "string", "enum": ["LOW", "MODERATE", "HIGH", "CRITICAL"]},
                    "status": {"type": "string", "default": "open"},
                },
            },
            requires_session=True,
            handler=list_top_risks,
        ))

        self.register(ToolDefinition(
            name="get_risk_details",
            description="Retrieves granular risk calculation details including linked asset, vulnerability, threat, and controls.",
            parameters={
                "type": "object",
                "properties": {
                    "risk_id": {"type": "string", "description": "UUID of the risk record"},
                },
                "required": ["risk_id"],
            },
            requires_session=True,
            handler=get_risk_details,
        ))

        self.register(ToolDefinition(
            name="get_asset_details",
            description="Retrieves asset metadata, criticality, business value, exposure, vulnerabilities, and incidents.",
            parameters={
                "type": "object",
                "properties": {
                    "asset_id": {"type": "string", "description": "UUID of the asset"},
                    "asset_name": {"type": "string", "description": "Name or substring of asset (e.g. 'Payment Service')"},
                },
            },
            requires_session=True,
            handler=get_asset_details,
        ))

        self.register(ToolDefinition(
            name="get_attack_paths",
            description="Discovers attack paths between entry-point assets and critical high-value services using the Neo4j graph engine.",
            parameters={
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 5},
                    "severity": {"type": "string"},
                },
            },
            requires_session=True,
            handler=get_attack_paths,
        ))

        self.register(ToolDefinition(
            name="get_blast_radius",
            description="Calculates downstream dependencies and blast radius if an asset is compromised.",
            parameters={
                "type": "object",
                "properties": {
                    "asset_id": {"type": "string", "description": "UUID of the asset"},
                },
                "required": ["asset_id"],
            },
            requires_session=True,
            handler=get_blast_radius,
        ))

        self.register(ToolDefinition(
            name="calculate_financial_risk",
            description="Calculates deterministic financial risk (EAL, Max Exposure, VaR) using the financial risk engine.",
            parameters={
                "type": "object",
                "properties": {
                    "asset_id": {"type": "string", "description": "Optional asset UUID to calculate for specific asset"},
                    "confidence_level": {"type": "number", "default": 0.95},
                },
            },
            requires_session=True,
            handler=calculate_financial_risk,
        ))

        self.register(ToolDefinition(
            name="run_monte_carlo",
            description="Runs a Monte Carlo stochastic loss exceedance simulation for value-at-risk analysis.",
            parameters={
                "type": "object",
                "properties": {
                    "expected_loss": {"type": "number", "default": 1000000.0},
                    "min_loss": {"type": "number", "default": 100000.0},
                    "max_loss": {"type": "number", "default": 5000000.0},
                    "probability": {"type": "number", "default": 0.35},
                    "simulations": {"type": "integer", "default": 2000},
                },
            },
            requires_session=False,
            handler=run_monte_carlo_tool,
        ))

        self.register(ToolDefinition(
            name="run_monte_carlo_tool",
            description="Runs a Monte Carlo stochastic loss exceedance simulation for value-at-risk analysis.",
            parameters={
                "type": "object",
                "properties": {
                    "expected_loss": {"type": "number", "default": 1000000.0},
                    "min_loss": {"type": "number", "default": 100000.0},
                    "max_loss": {"type": "number", "default": 5000000.0},
                    "probability": {"type": "number", "default": 0.35},
                    "simulations": {"type": "integer", "default": 2000},
                },
            },
            requires_session=False,
            handler=run_monte_carlo_tool,
        ))

        self.register(ToolDefinition(
            name="optimize_investment",
            description="Executes constraint-based OR-Tools portfolio optimizer to find the best security investments for a given budget.",
            parameters={
                "type": "object",
                "properties": {
                    "budget": {"type": "number", "default": 5000000.0, "description": "Budget in INR"},
                    "objective": {"type": "string", "enum": ["BALANCED", "MAX_RISK_REDUCTION", "MAX_LOSS_AVOIDED", "MAX_ROSI"], "default": "BALANCED"},
                    "time_horizon_months": {"type": "integer", "default": 12},
                    "max_projects": {"type": "integer", "default": 5},
                },
            },
            requires_session=False,
            handler=optimize_investment,
        ))

        self.register(ToolDefinition(
            name="compare_investments",
            description="Compares individual candidate controls on cost, risk reduction, loss avoided, and ROSI.",
            parameters={
                "type": "object",
                "properties": {
                    "investment_ids": {"type": "array", "items": {"type": "string"}},
                    "budget": {"type": "number", "default": 5000000.0},
                },
            },
            requires_session=False,
            handler=compare_investments,
        ))

        for name in ("simulate_scenario", "simulate_scenario_tool"):
            self.register(ToolDefinition(
                name=name,
                description="Simulates what-if security scenarios (e.g. MFA, patch CVEs, EDR expansion) and returns before/after risk & EAL.",
                parameters={
                    "type": "object",
                    "properties": {
                        "scenario_name": {"type": "string", "description": "Type of scenario e.g. mfa, patch, edr, backup, segmentation"},
                        "baseline_risk": {"type": "number", "default": 78.0},
                        "baseline_eal": {"type": "number", "default": 21400000.0},
                    },
                },
                requires_session=False,
                handler=simulate_scenario_tool,
            ))

        for name in ("get_compliance_summary", "get_compliance_summary_tool"):
            self.register(ToolDefinition(
                name=name,
                description="Returns organizational compliance scores and gaps across NIST CSF, ISO 27001, CIS Controls, RBI, and SEBI.",
                parameters={"type": "object", "properties": {}},
                requires_session=True,
                handler=get_compliance_summary_tool,
            ))

        for name in ("verify_blockchain_evidence", "verify_blockchain_evidence_tool"):
            self.register(ToolDefinition(
                name=name,
                description="Verifies cryptographic proof and ledger status of recorded risk evidence on the tamper-evident prototype.",
                parameters={
                    "type": "object",
                    "properties": {
                        "evidence_id": {"type": "string", "description": "UUID of the evidence record"},
                    },
                },
                requires_session=True,
                handler=verify_blockchain_evidence_tool,
            ))

        for name in ("get_ml_risk_signals", "get_ml_risk_signals_tool"):
            self.register(ToolDefinition(
                name=name,
                description="Fetches offline-trained ML incident predictions, anomaly detections, and 30-day risk forecasts.",
                parameters={
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "default": 5},
                    },
                },
                requires_session=True,
                handler=get_ml_risk_signals_tool,
            ))

        for name in ("get_recent_telemetry_events", "get_recent_telemetry"):
            self.register(ToolDefinition(
                name=name,
                description="Fetches recent security telemetry events, active alerts, and quantified risk changes (e.g. what changed in the last hour).",
                parameters={
                    "type": "object",
                    "properties": {
                        "window_minutes": {"type": "integer", "default": 60, "description": "Time window in minutes to look back"},
                        "limit": {"type": "integer", "default": 15},
                    },
                },
                requires_session=True,
                handler=get_recent_telemetry_events,
            ))

        for name in ("get_continuous_risk_drift", "get_continuous_risk_drift_tool"):
            self.register(ToolDefinition(
                name=name,
                description="Queries continuous cyber risk drift, recent score shifts, and cumulative financial exposure deltas.",
                parameters={"type": "object", "properties": {}},
                requires_session=True,
                handler=get_continuous_risk_drift_tool,
            ))


_registry_instance = ToolRegistry()


def get_tool_registry() -> ToolRegistry:
    return _registry_instance
