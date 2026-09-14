"""Context Builder for AI Risk Advisor.

Executes planned tools sequentially or concurrently via ToolExecutor,
retrieves relevant knowledge chunks via RAG retrieval service,
and compiles a clean, structured evidence bundle for LLM ingestion.
"""

from __future__ import annotations

import logging
from typing import Any, Callable
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.ai_advisor.citations import CitationCollector
from app.services.ai_advisor.schemas import AdvisorPlan, CitationItem, ToolExecutionResult
from app.services.ai_advisor.tool_executor import ToolExecutor
from app.services.rag.retrieval_service import retrieve_relevant_documents

logger = logging.getLogger(__name__)


class ExecutionContext:
    """Consolidated bundle of verified tool results, citations, and RAG knowledge."""

    def __init__(
        self,
        tool_traces: list[ToolExecutionResult],
        tool_data: dict[str, Any],
        citations: list[CitationItem],
        rag_passages: list[dict[str, Any]],
        evidence_hashes: list[str],
    ):
        self.tool_traces = tool_traces
        self.tool_data = tool_data
        self.citations = citations
        self.rag_passages = rag_passages
        self.evidence_hashes = evidence_hashes


class ContextBuilder:
    """Builds grounded context from deterministic backend tools and RAG."""

    def __init__(
        self,
        executor_factory: Callable[[AsyncSession, UUID], ToolExecutor] | None = None,
    ) -> None:
        self.executor_factory = executor_factory

    async def build(
        self,
        plan: AdvisorPlan,
        session: AsyncSession,
        user: User,
        organization_id: UUID,
        include_rag: bool = True,
    ) -> ExecutionContext:
        collector = CitationCollector()
        tool_traces: list[ToolExecutionResult] = []
        tool_data: dict[str, Any] = {}
        evidence_hashes: list[str] = []

        executor = (
            self.executor_factory(session, organization_id)
            if self.executor_factory
            else ToolExecutor(session=session, organization_id=organization_id)
        )

        # 1. Execute planned tools
        for tool_call in plan.tools:
            trace = await executor.execute_tool(
                call=tool_call,
                collector=collector,
            )
            tool_traces.append(trace)
            if trace.result_hash:
                evidence_hashes.append(trace.result_hash)

            if trace.success:
                tool_data[tool_call.tool_name] = trace.result
            else:
                logger.warning("Tool %s failed: %s", tool_call.tool_name, trace.error_message)
                tool_data[tool_call.tool_name] = {"error": trace.error_message or "Execution failed"}

        # 2. Query RAG Knowledge Base for regulatory/policy context
        rag_passages: list[dict[str, Any]] = []
        if include_rag and plan.intent != "SECURITY_REFUSAL":
            try:
                rag_results = await retrieve_relevant_documents(
                    session=session,
                    query=plan.question,
                    organization_id=organization_id,
                    top_k=3,
                )
                for r in rag_results:
                    rag_passages.append(
                        {
                            "document_title": r.document_title,
                            "category": r.category,
                            "content": r.content,
                            "score": r.score,
                        }
                    )
                    collector.add(
                        source_type="rag_knowledge",
                        source_id=f"{r.document_id}:{r.chunk_index}",
                        description=f"Policy/Standard: {r.document_title} ({r.category})",
                        metadata={"framework": r.category, "score": r.score},
                    )
            except Exception as e:
                logger.warning("RAG retrieval skipped or encountered error: %s", e)

        return ExecutionContext(
            tool_traces=tool_traces,
            tool_data=tool_data,
            citations=collector.get_all(),
            rag_passages=rag_passages,
            evidence_hashes=evidence_hashes,
        )
