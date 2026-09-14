"""Safe execution engine for AI Advisor tools with tenant isolation and audit hashing."""

import hashlib
import inspect
import json
import time
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai_advisor.citations import CitationCollector
from app.services.ai_advisor.schemas import ToolCall, ToolExecutionResult
from app.services.ai_advisor.tool_registry import get_tool_registry


class ToolExecutor:
    """Safely invokes registered tools within an authenticated organization boundary."""

    def __init__(self, session: AsyncSession, organization_id: UUID) -> None:
        self.session = session
        self.organization_id = organization_id
        self.registry = get_tool_registry()

    async def execute_tool(
        self,
        call: ToolCall,
        collector: CitationCollector | None = None,
    ) -> ToolExecutionResult:
        tool = self.registry.get(call.tool_name)
        if not tool:
            return ToolExecutionResult(
                tool_name=call.tool_name,
                arguments=call.arguments,
                result={"error": f"Tool '{call.tool_name}' is not registered."},
                success=False,
                error_message=f"Tool '{call.tool_name}' not found",
            )

        start_time = time.perf_counter()
        kwargs = dict(call.arguments)

        # Enforce validation on common numeric fields
        if "budget" in kwargs:
            try:
                kwargs["budget"] = max(0.0, float(kwargs["budget"]))
            except (ValueError, TypeError):
                kwargs["budget"] = 0.0
        if "limit" in kwargs:
            try:
                kwargs["limit"] = max(1, min(int(kwargs["limit"]), 50))
            except (ValueError, TypeError):
                kwargs["limit"] = 5
        if "max_projects" in kwargs and kwargs["max_projects"] is not None:
            try:
                kwargs["max_projects"] = max(1, int(kwargs["max_projects"]))
            except (ValueError, TypeError):
                kwargs["max_projects"] = 5

        # Validate and convert UUID fields safely
        for id_field in ("asset_id", "risk_id", "evidence_id"):
            if id_field in kwargs and kwargs[id_field]:
                raw_val = kwargs[id_field]
                if isinstance(raw_val, str):
                    try:
                        kwargs[id_field] = UUID(raw_val)
                    except ValueError:
                        # If not a valid UUID, pass None or keep for name search in asset_tools
                        if id_field == "asset_id":
                            kwargs.setdefault("asset_name", raw_val)
                            kwargs["asset_id"] = None
                        else:
                            return ToolExecutionResult(
                                tool_name=call.tool_name,
                                arguments=call.arguments,
                                result={"error": f"Invalid UUID provided for {id_field}: {raw_val}"},
                                success=False,
                                error_message=f"Invalid UUID for {id_field}",
                            )

        # Inject organization scope and session if handler expects them
        sig = inspect.signature(tool.handler)
        if "session" in sig.parameters:
            kwargs["session"] = self.session
        if "organization_id" in sig.parameters:
            kwargs["organization_id"] = self.organization_id
        if "collector" in sig.parameters and collector is not None:
            kwargs["collector"] = collector

        # Execute handler safely
        try:
            if inspect.iscoroutinefunction(tool.handler):
                res = await tool.handler(**kwargs)
            else:
                res = tool.handler(**kwargs)
            success = True
            error_msg = None
        except Exception as exc:
            res = {"error": f"Tool execution failed: {str(exc)}"}
            success = False
            error_msg = str(exc)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        # Compute deterministic hash of the tool payload
        try:
            serialized = json.dumps(res, sort_keys=True, default=str)
        except Exception:
            serialized = str(res)
        result_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        return ToolExecutionResult(
            tool_name=call.tool_name,
            arguments=call.arguments,
            result=res,
            success=success,
            error_message=error_msg,
            execution_time_ms=elapsed_ms,
            citations=collector.get_all() if collector else [],
            result_hash=result_hash,
        )
