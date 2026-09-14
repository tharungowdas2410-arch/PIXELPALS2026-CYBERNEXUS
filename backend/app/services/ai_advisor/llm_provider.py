"""LLM provider abstraction supporting OpenAI and deterministic fallback."""

from abc import ABC, abstractmethod
import json
import re
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel

from app.core.ai_config import get_ai_config
from app.services.ai_advisor.guardrails import SYSTEM_PROMPT

T = TypeVar("T", bound=BaseModel)


class LLMProvider(ABC):
    """Abstract interface for natural language reasoning engines."""

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str | None = None) -> str:
        """Generates raw text response."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        schema: type[T],
        system_prompt: str | None = None,
    ) -> T:
        """Generates structured response validated against a Pydantic schema."""
        pass


class OpenAIProvider(LLMProvider):
    """OpenAI API implementation using httpx."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", temperature: float = 0.1) -> None:
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.base_url = "https://api.openai.com/v1"

    async def generate(self, prompt: str, system_prompt: str | None = None) -> str:
        sys = system_prompt or SYSTEM_PROMPT
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": sys},
                {"role": "user", "content": prompt},
            ],
            "temperature": self.temperature,
            "max_tokens": 2000,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()

    async def generate_structured(
        self,
        prompt: str,
        schema: type[T],
        system_prompt: str | None = None,
    ) -> T:
        sys = (system_prompt or SYSTEM_PROMPT) + "\nYou MUST return only valid JSON conforming strictly to the requested schema."
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": sys},
                {"role": "user", "content": prompt},
            ],
            "temperature": self.temperature,
            "response_format": {"type": "json_object"},
            "max_tokens": 2500,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            parsed_json = json.loads(raw_text)
            return schema.model_validate(parsed_json)


class FallbackProvider(LLMProvider):
    """Deterministic, zero-hallucination fallback engine when LLM is unconfigured."""

    async def generate(self, prompt: str, system_prompt: str | None = None) -> str:
        return "Deterministic fallback response based on verified platform data."

    async def generate_structured(
        self,
        prompt: str,
        schema: type[T],
        system_prompt: str | None = None,
    ) -> T:
        # Structured template synthesis is handled by context_builder & advisor_service
        # which populate schema fields directly from tool outputs.
        raise NotImplementedError("Use advisor_service synthesis for fallback structured generation.")


def get_llm_provider() -> LLMProvider:
    cfg = get_ai_config()
    if cfg.is_active and cfg.openai_api_key:
        return OpenAIProvider(
            api_key=cfg.openai_api_key,
            model=cfg.openai_model,
            temperature=cfg.ai_temperature,
        )
    return FallbackProvider()
