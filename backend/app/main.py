from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes import (
    advisor,
    assets,
    attack_paths,
    audit,
    auth,
    blockchain,
    compliance,
    controls,
    dashboard,
    demo,
    financial,
    graph,
    incidents,
    integrations,
    investments,
    ml,
    organizations,
    reports,
    risks,
    scenarios,
    system,
    threats,
    users,
    vulnerabilities,
)
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import (
    CorrelationIdMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)

setup_logging()

app = FastAPI(
    title=settings.app_name,
    description=(
        "AI-powered continuous cyber risk quantification prototype for SIH 26105. "
        "Financial figures are illustrative model outputs, not actuarial estimates. "
        "Attack paths are synthesised from graph traversal or inference fall-back when "
        "Neo4j is not connected."
    ),
    version="0.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# 1. Defense-in-depth Middlewares (executed in reverse order of addition)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CorrelationIdMiddleware)

# 2. CORS Policy Hardening
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

prefix = settings.api_v1_prefix
for module in (
    auth,
    users,
    organizations,
    assets,
    vulnerabilities,
    controls,
    threats,
    risks,
    dashboard,
    financial,
    investments,
    scenarios,
    incidents,
    compliance,
    blockchain,
    attack_paths,
    graph,
    advisor,
    integrations,
    ml,
    audit,
    system,
    reports,
    demo,
):
    app.include_router(module.router, prefix=prefix)


# --------------------------------------------------------------------------- #
# Observability: Health, Liveness & Readiness Checks
# --------------------------------------------------------------------------- #


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name, "version": "0.3.0"}


@app.get("/health/live")
async def liveness() -> dict[str, str]:
    return {"status": "alive", "service": settings.app_name}


@app.get("/health/ready")
async def readiness() -> dict[str, Any]:
    checks: dict[str, Any] = {}
    is_ready = True

    # Check Primary Database
    try:
        async with SessionLocal() as session:
            await session.execute(select(1))
        checks["database"] = {"status": "HEALTHY"}
    except Exception as exc:
        checks["database"] = {"status": "UNHEALTHY", "error": str(exc)}
        is_ready = False

    # Check Neo4j (Optional - does not fail readiness if disabled)
    checks["neo4j"] = {
        "status": "HEALTHY" if settings.neo4j_uri else "DEGRADED",
        "optional": True,
    }

    return {
        "status": "ready" if is_ready else "not_ready",
        "service": settings.app_name,
        "checks": checks,
    }
