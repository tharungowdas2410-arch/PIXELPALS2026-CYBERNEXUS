"""AI Risk Advisor Package."""

from app.services.ai_advisor.advisor_service import AIAdvisorService
from app.services.ai_advisor.citations import CitationCollector
from app.services.ai_advisor.context_builder import ContextBuilder, ExecutionContext
from app.services.ai_advisor.guardrails import (
    SYSTEM_PROMPT,
    build_safe_data_block,
    detect_prompt_injection,
    sanitize_data_content,
)
from app.services.ai_advisor.llm_provider import FallbackProvider, LLMProvider, OpenAIProvider, get_llm_provider
from app.services.ai_advisor.planner import IntentPlanner
from app.services.ai_advisor.prompt_builder import PromptBuilder
from app.services.ai_advisor.schemas import (
    AdvisorAskRequest,
    AdvisorAuditLogRead,
    AdvisorDecisionBrief,
    AdvisorPlan,
    AdvisorPlanRequest,
    AdvisorResponse,
    CitationItem,
    ToolCall,
    ToolExecutionResult,
)
from app.services.ai_advisor.tool_executor import ToolExecutor
from app.services.ai_advisor.tool_registry import ToolRegistry, get_tool_registry

__all__ = [
    "AIAdvisorService",
    "CitationCollector",
    "ContextBuilder",
    "ExecutionContext",
    "SYSTEM_PROMPT",
    "detect_prompt_injection",
    "sanitize_data_content",
    "build_safe_data_block",
    "LLMProvider",
    "OpenAIProvider",
    "FallbackProvider",
    "get_llm_provider",
    "IntentPlanner",
    "PromptBuilder",
    "AdvisorAskRequest",
    "AdvisorPlanRequest",
    "AdvisorResponse",
    "AdvisorDecisionBrief",
    "AdvisorAuditLogRead",
    "CitationItem",
    "ToolCall",
    "ToolExecutionResult",
    "ToolExecutor",
    "ToolRegistry",
    "get_tool_registry",
]
