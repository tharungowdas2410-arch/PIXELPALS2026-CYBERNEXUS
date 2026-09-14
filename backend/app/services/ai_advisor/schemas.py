"""Pydantic schemas for the AI Risk Advisor, tools, and execution artifacts."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CitationItem(BaseModel):
    """Citation referencing verifiable backend evidence."""

    source_type: str = Field(..., description="Type of source e.g. risk, asset, attack_path, optimization, rag")
    source_id: str = Field(..., description="Internal identifier or UUID")
    description: str = Field(..., description="Human-readable description of the evidence")
    timestamp: str = Field(..., description="ISO timestamp when the evidence was computed or recorded")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional context or key values")


class ToolCall(BaseModel):
    """A tool planned for execution by the advisor planner."""

    tool_name: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    order: int = 1
    reason: str = ""


class ToolExecutionResult(BaseModel):
    """Outcome of invoking a registered backend tool."""

    tool_name: str
    arguments: dict[str, Any]
    result: Any
    success: bool
    error_message: str | None = None
    execution_time_ms: float = 0.0
    citations: list[CitationItem] = Field(default_factory=list)
    result_hash: str = ""


class AdvisorPlan(BaseModel):
    """Execution plan formulated by the Intent & Tool Planner."""

    question: str
    intent: str
    tools: list[ToolCall]
    reasoning: str
    framework_topics: list[str] = Field(default_factory=list)


class AdvisorAskRequest(BaseModel):
    """Incoming user inquiry to the AI Advisor."""

    question: str = Field(..., min_length=2, max_length=1000)
    conversation_id: str | None = None
    include_sources: bool = True
    budget_override: float | None = Field(default=None, ge=0)


class AdvisorPlanRequest(BaseModel):
    """Request to inspect tool execution plan without running full generation."""

    question: str = Field(..., min_length=2, max_length=1000)


class AdvisorResponse(BaseModel):
    """Structured, fully grounded response from AI Risk Advisor."""

    answer: str
    summary: str
    key_findings: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    financial_impact: dict[str, Any] = Field(default_factory=dict)
    why_recommendation: str = ""
    evidence: list[CitationItem] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    confidence: Literal["HIGH", "MEDIUM", "LOW"] = "HIGH"
    limitations: str = "Illustrative estimate derived from verified platform data."
    tools_used: list[str] = Field(default_factory=list)
    tool_trace: list[dict[str, Any]] = Field(default_factory=list)
    model: str = "fallback"
    model_version: str = "1.0.0"
    timestamp: str = ""
    audit_id: str | None = None
    decision_payload_hash: str | None = None
    illustrative: bool = True


class AdvisorDecisionBrief(BaseModel):
    """Executive Decision Brief generated for CISO/Board presentations."""

    title: str = "Executive Cybersecurity Risk & Investment Decision Brief"
    organization_name: str
    generated_at: str
    executive_summary: str
    current_risk: dict[str, Any]
    top_business_risks: list[dict[str, Any]]
    financial_exposure: dict[str, Any]
    recommended_investment: dict[str, Any]
    expected_risk_reduction: dict[str, Any]
    expected_loss_avoided: dict[str, Any]
    portfolio_rosi: dict[str, Any]
    compliance_implications: list[dict[str, Any]]
    top_3_actions: list[str]
    assumptions: list[str]
    evidence: list[CitationItem]
    decision_hash: str
    illustrative: bool = True


class AdvisorAuditLogRead(BaseModel):
    """Serialized audit log record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    user_id: UUID | None
    question: str
    selected_tools: list[str]
    tool_arguments: dict[str, Any]
    tool_results_hash: str
    answer: str
    summary: str | None
    recommendations: list[dict[str, Any]] | None
    financial_impact: dict[str, Any] | None
    evidence: list[dict[str, Any]] | None
    assumptions: list[str] | None
    confidence: str
    model: str
    model_version: str
    prompt_version: str
    blockchain_evidence_id: UUID | None
    created_at: datetime
