from functools import lru_cache

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "CYBERNEXUS"
    app_env: str = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    secret_key: str = Field(default="dev-only-change-me-please", min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    jwt_issuer: str = "cybernexus-auth"
    jwt_audience: str = "cybernexus-platform"

    # Rate Limiting (per minute)
    rate_limit_enabled: bool = True
    auth_rate_limit: int = 15
    ai_rate_limit: int = 30
    webhook_rate_limit: int = 100
    api_rate_limit: int = 120

    # Account Lockout & Login Protection
    max_failed_login_attempts: int = 5
    account_lockout_minutes: int = 15

    # Data Retention (days)
    security_event_retention_days: int = 90
    audit_log_retention_days: int = 365
    ai_audit_retention_days: int = 90

    # Demo & Safety Controls
    demo_safe_mode: bool = True
    demo_mode: bool = True

    database_url: str = "sqlite+aiosqlite:///./cybernexus.db"
    database_sync_url: str | None = None

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    seed_admin_email: str = "ciso@northbridge.example"
    seed_admin_password: str = "ChangeMe_demo1!"

    neo4j_uri: str | None = None
    neo4j_username: str = "neo4j"
    neo4j_password: str | None = None
    neo4j_max_depth: int = 6

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sync_database_url(self) -> str:
        if self.database_sync_url:
            return self.database_sync_url
        return (
            self.database_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
            .replace("sqlite+aiosqlite://", "sqlite://", 1)
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
