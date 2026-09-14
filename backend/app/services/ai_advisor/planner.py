"""Intent and Tool Execution Planner for AI Risk Advisor.

Analyzes user questions to detect intent, extract budget/entity parameters,
and assemble an ordered sequence of deterministic backend tool calls.
"""

from __future__ import annotations

import re
from typing import Any

from app.services.ai_advisor.guardrails import detect_prompt_injection
from app.services.ai_advisor.schemas import AdvisorPlan, ToolCall


def parse_currency_amount(text: str) -> float | None:
    """Extract Indian Rupee (INR) or standard numerical budget amounts from text."""
    cleaned = text.replace(",", "").strip()

    # Match crore: e.g. "1.5 crore", "1 crore", "2cr"
    cr_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:crores?|crore|cr)\b", cleaned, re.IGNORECASE)
    if cr_match:
        return float(cr_match.group(1)) * 10_000_000.0

    # Match lakh: e.g. "50 lakh", "50lakh", "50L", "25 lac"
    lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakhs?|lakh|lacs?|lac|l)\b", cleaned, re.IGNORECASE)
    if lakh_match:
        return float(lakh_match.group(1)) * 100_000.0

    # Match raw numbers like ₹5000000 or 5000000
    num_match = re.search(r"(?:₹|\bRs\.?|\bINR)?\s*(\d{5,12})\b", cleaned, re.IGNORECASE)
    if num_match:
        return float(num_match.group(1))

    return None


class IntentPlanner:
    """Classifies user inquiry intent and plans structured tool execution."""

    def plan(self, question: str, budget_override: float | None = None) -> AdvisorPlan:
        # Check prompt injection
        is_injection, injection_reason = detect_prompt_injection(question)
        if is_injection:
            return AdvisorPlan(
                question=question,
                intent="SECURITY_REFUSAL",
                tools=[],
                reasoning=f"Question rejected by safety guardrails: {injection_reason}",
                framework_topics=["Security Guardrails"],
            )

        q_lower = question.lower()
        extracted_budget = budget_override or parse_currency_amount(question)
        planned_tools: list[ToolCall] = []
        framework_topics: list[str] = []

        # 0. Continuous Telemetry & Risk Shift intent ("What changed in the last hour?", "What happened?", "Why did the score change?")
        if any(w in q_lower for w in ["what changed", "what happened", "why did risk change", "why did the score", "why did score", "recent telemetry", "last hour", "telemetry", "risk shift", "recent alerts", "drift"]):
            intent = "TELEMETRY_AND_RISK_SHIFT"
            reasoning = "User is asking about recent telemetry events, telemetry-driven risk shifts, or what changed in the environment."
            planned_tools = [
                ToolCall(
                    tool_name="get_recent_telemetry_events",
                    arguments={"window_minutes": 60, "limit": 15},
                    order=1,
                    reason="Fetch recent enterprise telemetry events, alerts, and risk score deltas",
                ),
                ToolCall(
                    tool_name="get_continuous_risk_drift",
                    arguments={},
                    order=2,
                    reason="Assess continuous risk trajectory and cumulative financial exposure change",
                ),
                ToolCall(
                    tool_name="get_attack_paths",
                    arguments={"limit": 5},
                    order=3,
                    reason="Verify if recent events opened or aggravated critical graph attack paths",
                ),
                ToolCall(
                    tool_name="calculate_financial_risk",
                    arguments={},
                    order=4,
                    reason="Quantify updated financial impact and Expected Annual Loss (EAL)",
                ),
                ToolCall(
                    tool_name="list_top_risks",
                    arguments={"limit": 5},
                    order=5,
                    reason="Correlate telemetry shifts with top assets and vulnerabilities",
                ),
            ]
            framework_topics = ["Continuous Security Monitoring", "Real-Time Telemetry Correlation", "Attack Path Aggravation"]

        # 1. Investment Optimization intent
        elif any(w in q_lower for w in ["spend", "invest", "budget", "optimize", "roi", "rosi", "allocate", "allocation", "fix first"]):
            intent = "INVESTMENT_OPTIMIZATION"
            reasoning = "User is asking for optimal budget allocation, prioritized remediation, or ROI/ROSI analysis."
            budget_val = extracted_budget if extracted_budget is not None else 5_000_000.0
            planned_tools = [
                ToolCall(
                    tool_name="get_dashboard_summary",
                    arguments={},
                    order=1,
                    reason="Fetch high-level posture and organizational baseline",
                ),
                ToolCall(
                    tool_name="list_top_risks",
                    arguments={"limit": 10},
                    order=2,
                    reason="Identify top prioritized risks requiring intervention",
                ),
                ToolCall(
                    tool_name="optimize_investment",
                    arguments={"budget": budget_val},
                    order=3,
                    reason=f"Solve knapsack/constraint optimization with budget ₹{budget_val:,.0f}",
                ),
                ToolCall(
                    tool_name="calculate_financial_risk",
                    arguments={},
                    order=4,
                    reason="Calculate financial baseline exposure (EAL and VaR)",
                ),
            ]
            framework_topics = ["NIST CSF ID.RA", "CIS Controls v8.1", "Investment Optimization"]

        # 2. Attack Paths and Blast Radius intent
        elif any(w in q_lower for w in ["attack path", "attack graph", "reachability", "blast radius", "lateral", "kill chain", "pivot", "attacker", "compromise"]):
            intent = "ATTACK_PATH_ANALYSIS"
            reasoning = "User is inquiring about graph-based attack paths, lateral movement, or blast radius."
            planned_tools = [
                ToolCall(
                    tool_name="get_attack_paths",
                    arguments={"limit": 5},
                    order=1,
                    reason="Query Neo4j graph for critical attack paths reaching crown jewel assets",
                ),
                ToolCall(
                    tool_name="get_blast_radius",
                    arguments={},
                    order=2,
                    reason="Determine blast radius and affected downstream assets",
                ),
                ToolCall(
                    tool_name="list_top_risks",
                    arguments={"limit": 5},
                    order=3,
                    reason="Correlate attack paths with active risk register entries",
                ),
            ]
            framework_topics = ["MITRE ATT&CK", "Graph Blast Radius", "NIST CSF PR.AC"]

        # 3. Financial Exposure and Monte Carlo intent
        elif any(w in q_lower for w in ["financial", "exposure", "monte carlo", "var", "eal", "loss", "worst case", "rupees", "dollar", "cost"]):
            intent = "FINANCIAL_RISK_QUANTIFICATION"
            reasoning = "User seeks quantitative financial risk analysis, Value at Risk, and loss distributions."
            planned_tools = [
                ToolCall(
                    tool_name="calculate_financial_risk",
                    arguments={},
                    order=1,
                    reason="Compute Expected Annual Loss (EAL) and VaR 95%",
                ),
                ToolCall(
                    tool_name="run_monte_carlo_tool",
                    arguments={"simulations": 1000},
                    order=2,
                    reason="Execute Monte Carlo simulation for 1,000 iterations",
                ),
                ToolCall(
                    tool_name="list_top_risks",
                    arguments={"limit": 5},
                    order=3,
                    reason="Identify primary risk drivers contributing to financial loss",
                ),
            ]
            framework_topics = ["FAIR Cyber Risk Framework", "Monte Carlo Loss Simulation"]

        # 4. What-if Scenario Simulation intent
        elif any(w in q_lower for w in ["what if", "simulate", "what happens if", "if we add", "if i add", "implement mfa", "deploy edr"]):
            intent = "SCENARIO_SIMULATION"
            reasoning = "User wants to test a hypothetical security change and measure risk reduction."
            scenario_name = "security_control_enhancement"
            if "mfa" in q_lower:
                scenario_name = "mfa_enforcement"
            elif "edr" in q_lower:
                scenario_name = "edr_deployment"
            planned_tools = [
                ToolCall(
                    tool_name="simulate_scenario_tool",
                    arguments={"scenario_name": scenario_name},
                    order=1,
                    reason=f"Simulate '{scenario_name}' on risk graph and recalculate impact",
                ),
                ToolCall(
                    tool_name="list_top_risks",
                    arguments={"limit": 5},
                    order=2,
                    reason="Compare pre- and post-scenario risk states",
                ),
            ]
            framework_topics = ["What-If Simulation", "Residual Risk Assessment"]

        # 5. Blockchain Evidence & Integrity intent
        elif any(w in q_lower for w in ["blockchain", "evidence", "tamper", "immutable", "audit trail", "notariz", "integrity"]):
            intent = "BLOCKCHAIN_EVIDENCE_VERIFICATION"
            reasoning = "User is verifying the cryptographic integrity of audit records or evidence hashes."
            planned_tools = [
                ToolCall(
                    tool_name="verify_blockchain_evidence_tool",
                    arguments={},
                    order=1,
                    reason="Verify cryptographic hashes and ledger proofs against simulated blockchain",
                ),
                ToolCall(
                    tool_name="get_dashboard_summary",
                    arguments={},
                    order=2,
                    reason="Retrieve posture snapshot tied to evidence ledger",
                ),
            ]
            framework_topics = ["Cryptographic Auditability", "Chain of Custody"]

        # 6. Compliance & Regulatory intent
        elif any(w in q_lower for w in ["compliance", "regulatory", "rbi", "sebi", "iso", "27001", "nist", "cert-in", "framework", "gap"]):
            intent = "COMPLIANCE_EVALUATION"
            reasoning = "User is assessing regulatory compliance across RBI, SEBI, ISO 27001, or NIST CSF."
            planned_tools = [
                ToolCall(
                    tool_name="get_compliance_summary_tool",
                    arguments={},
                    order=1,
                    reason="Inspect compliance gaps, control scores, and audit readiness",
                ),
                ToolCall(
                    tool_name="list_top_risks",
                    arguments={"limit": 5},
                    order=2,
                    reason="Map unmitigated risks to compliance framework requirements",
                ),
            ]
            framework_topics = ["RBI Cyber Security Framework", "SEBI CSCRF", "ISO/IEC 27001:2022", "NIST CSF 2.0"]

        # 7. Machine Learning Signals intent
        elif any(w in q_lower for w in ["ml", "machine learning", "anomaly", "prediction", "trend", "signals", "ai model"]):
            intent = "ML_SIGNALS_ANALYSIS"
            reasoning = "User is inquiring about ML-driven anomaly detection and predictive risk indicators."
            planned_tools = [
                ToolCall(
                    tool_name="get_ml_risk_signals_tool",
                    arguments={},
                    order=1,
                    reason="Fetch predictive risk signals, trend projections, and asset anomaly scores",
                ),
                ToolCall(
                    tool_name="list_top_risks",
                    arguments={"limit": 5},
                    order=2,
                    reason="Correlate ML signals with known operational risks",
                ),
            ]
            framework_topics = ["Predictive Threat Intelligence", "Anomalous Behavioral Signals"]

        # 8. Specific Asset or Risk detail
        elif any(w in q_lower for w in ["why is", "explain risk", "details on", "tell me about"]):
            intent = "SPECIFIC_RISK_OR_ASSET_EXPLANATION"
            reasoning = "User is drilling into a specific risk or asset explanation."
            planned_tools = [
                ToolCall(
                    tool_name="list_top_risks",
                    arguments={"limit": 10},
                    order=1,
                    reason="Search risk register to find matching entity details",
                ),
                ToolCall(
                    tool_name="get_attack_paths",
                    arguments={"limit": 3},
                    order=2,
                    reason="Check if the asset or risk is involved in an active attack vector",
                ),
            ]
            framework_topics = ["Root Cause Analysis", "Asset Criticality Assessment"]

        # 9. General Risk Posture / Default
        else:
            intent = "GENERAL_RISK_OVERVIEW"
            reasoning = "User requested a general assessment or top risks inquiry."
            planned_tools = [
                ToolCall(
                    tool_name="get_dashboard_summary",
                    arguments={},
                    order=1,
                    reason="Retrieve executive posture overview and overall risk score",
                ),
                ToolCall(
                    tool_name="list_top_risks",
                    arguments={"limit": 5},
                    order=2,
                    reason="List the most urgent active organizational risks",
                ),
                ToolCall(
                    tool_name="calculate_financial_risk",
                    arguments={},
                    order=3,
                    reason="Provide organizational financial baseline exposure",
                ),
            ]
            framework_topics = ["Enterprise Risk Posture", "Continuous Cyber Risk Quantification"]

        return AdvisorPlan(
            question=question,
            intent=intent,
            tools=planned_tools,
            reasoning=reasoning,
            framework_topics=framework_topics,
        )
