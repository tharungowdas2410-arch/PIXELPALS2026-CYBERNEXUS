import os
from pathlib import Path

os.environ.setdefault("SECRET_KEY", "test-secret-key-16chars")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("APP_ENV", "test")

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import get_db
from app.main import app
from app.models import Base
from ml.models.incident_likelihood import IncidentLikelihoodTrainer

get_settings.cache_clear()

_ARTIFACT = Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "incident_likelihood_v1.joblib"
if not _ARTIFACT.exists():
    IncidentLikelihoodTrainer(n_records=400, seed=26105).save_model(_ARTIFACT)

engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture
async def session() -> AsyncIterator[AsyncSession]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with TestingSession() as db:
        yield db
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client(session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def _override_db() -> AsyncIterator[AsyncSession]:
        yield session

    app.dependency_overrides[get_db] = _override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def auth_headers(client: AsyncClient, email: str = "ciso@example.com") -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": "Northbridge Holdings",
            "industry": "financial_services",
            "country": "IN",
            "email": email,
            "password": "ChangeMe_demo1!",
            "full_name": "A. Mehta",
            "role": "ciso",
        },
    )
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
