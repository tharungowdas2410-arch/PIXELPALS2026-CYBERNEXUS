"""Prompt Builder for AI Risk Advisor.

Safely compiles system instructions, tool execution results, RAG passages,
and user question into a structured prompt with injection defense.
"""

from __future__ import annotations

import json
from typing import Any

from app.services.ai_advisor.context_builder import ExecutionContext
from app.services.ai_advisor.guardrails import SYSTEM_PROMPT, build_safe_data_block


class PromptBuilder:
    """Constructs safe, grounded prompts for LLM providers."""

    def build_prompt(
        self,
        question: str,
        context: ExecutionContext,
        organization_name: str = "Enterprise Organization",
    ) -> tuple[str, str]:
        """Builds system message and user message.

        Returns:
            (system_prompt, user_prompt)
        """
        system = SYSTEM_PROMPT.strip()

        # Build data sections
        data_blocks: list[str] = []
        for tool_name, data in context.tool_data.items():
            formatted_data = json.dumps(data, indent=2, default=str)
            data_blocks.append(build_safe_data_block(tool_name, formatted_data))

        # Build RAG excerpts
        rag_blocks: list[str] = []
        for doc in context.rag_passages:
            rag_blocks.append(
                f"- **{doc['document_title']}** [{doc['category']}]:\n  {doc['content']}"
            )

        rag_section = ""
        if rag_blocks:
            rag_section = (
                "\n<REGULATORY_AND_POLICY_KNOWLEDGE>\n"
                + "\n\n".join(rag_blocks)
                + "\n</REGULATORY_AND_POLICY_KNOWLEDGE>\n"
            )

        user_content = f"""ORGANIZATION CONTEXT: {organization_name}

{rag_section}
{''.join(data_blocks)}

USER INQUIRY:
"{question}"

INSTRUCTIONS FOR YOUR RESPONSE:
1. Ground your response STRICTLY in the verified platform data and regulatory knowledge above.
2. If optimizing budget, explicitly state the total cost, expected risk reduction %, EAL avoided, and ROSI.
3. If analyzing attack paths, mention the exact stages (e.g. Initial Access -> Lateral Movement -> Crown Jewel).
4. Do NOT invent numbers or simulate data outside what is provided.
5. Provide:
   - SUMMARY: High-level CISO takeaway.
   - KEY FINDINGS: Bulleted specific risk facts from the data.
   - RECOMMENDATIONS: Concrete steps with prioritized impact.
   - FINANCIAL IMPACT: Quantified risk reduction and financial ROI/loss avoidance.
   - WHY THIS RECOMMENDATION: Clear causal reasoning based on blast radius, vulnerability severity, and graph centrality.
   - ASSUMPTIONS: List models (e.g., Knapsack OR-Tools, Monte Carlo, FAIR).
   - LIMITATIONS: Explicitly note data coverage or illustrative demo baseline.
"""
        return system, user_content
