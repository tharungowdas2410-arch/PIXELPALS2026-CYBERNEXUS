"""AI Risk Advisor configuration and settings."""

from functools import lru_cache
import os
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class AIConfig(BaseSettings):
    """Configuration for AI Advisor and LLM provider."""

    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    llm_provider: str = Field(default="openai", alias="LLM_PROVIDER")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    ai_temperature: float = Field(default=0.1, alias="AI_TEMPERATURE")
    ai_max_tokens: int = Field(default=2000, alias="AI_MAX_TOKENS")
    ai_enabled: bool = Field(default=True, alias="AI_ENABLED")
    ai_prompt_version: str = Field(default="1.0.0", alias="AI_PROMPT_VERSION")
    ai_model_version: str = Field(default="1.0.0", alias="AI_MODEL_VERSION")

    @property
    def is_active(self) -> bool:
        """True if AI is enabled and valid provider configuration exists."""
        if not self.ai_enabled:
            return False
        if self.llm_provider.lower() == "openai":
            return bool(self.openai_api_key and len(self.openai_api_key.strip()) > 5)
        return False


@lru_cache
def get_ai_config() -> AIConfig:
    return AIConfig()
