"""Graph API routes — health, sync, asset graph, blast radius, critical paths."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Path

from app.api.deps import CurrentUser, DbSession
from app.repositories.neo4j_repository import Neo4jUnavailable
from app.schemas.common import DataResponse
from app.services.attack_path_service import AttackPathService, get_attack_path_service
from app.services.graph_sync_service import GraphSyncService
from app.services.neo4j_service import get_neo4j_service

router = APIRouter(prefix="/graph", tags=["graph"])


def _service() -> AttackPathService:
    return get_attack_path_service()


def _graph_sync() -> GraphSyncService:
    return GraphSyncService()


@router.get("/health")
async def graph_health(user: CurrentUser) -> DataResponse[dict]:
    health = get_neo4j_service().health()
    return DataResponse(
        data={
            "neo4j": health.neo4j,
            "configured": health.configured,
            "message": health.message,
            "graph_intelligence_enabled": True,
            "fallback_inference_available": True,
        }
    )


@router.post("/sync")
async def sync_organization_graph(user: CurrentUser, session: DbSession) -> DataResponse[dict]:
    report = await _graph_sync().sync_all(session, user.organization_id)
    if not report.graph_available:
        raise HTTPException(
            status_code=503,
            detail={
                "neo4j": "unavailable",
                "message": (report.errors or ["Graph database not configured"])[0],
                "note": (
                    "Asset graph fallback inference is still available for attack-path queries "
                    "without Neo4j, but persistence is skipped."
                ),
            },
        )
    return DataResponse(
        data={
            "organization_id": str(report.organization_id),
            "organizations_synced": report.organizations,
            "assets_synced": report.assets,
            "vulnerabilities_synced": report.vulnerabilities,
            "threats_synced": report.threats,
            "controls_synced": report.controls,
            "relationships_synced": report.relationships,
            "idempotent": True,
            "errors": report.errors or [],
        }
    )


@router.post("/sync/asset/{asset_id}")
async def sync_asset_graph(
    user: CurrentUser,
    session: DbSession,
    asset_id: UUID = Path(...),
) -> DataResponse[dict]:
    report = await _graph_sync().sync_asset(session, user.organization_id, asset_id)
    if not report.graph_available and report.errors:
        raise HTTPException(status_code=503, detail={"neo4j": "unavailable", "message": report.errors[0]})
    return DataResponse(
        data={
            "organization_id": str(report.organization_id),
            "asset_id": str(asset_id),
            "assets_synced": report.assets,
            "vulnerabilities_synced": report.vulnerabilities,
            "idempotent": True,
            "errors": report.errors or [],
        }
    )


@router.get("/assets/{asset_id}")
async def get_asset_graph(
    user: CurrentUser,
    session: DbSession,
    asset_id: UUID = Path(...),
) -> DataResponse[dict]:
    service = _service()
    try:
        data = await service.asset_graph(session, organization_id=user.organization_id, asset_id=asset_id)
    except Neo4jUnavailable as exc:
        raise HTTPException(status_code=503, detail={"neo4j": "unavailable", "message": exc.message})
    if data.get("center") is None:
        raise HTTPException(status_code=404, detail="Asset not found in organization")
    return DataResponse(data=data)


@router.get("/asset/{asset_id}/blast-radius")
async def get_blast_radius(
    user: CurrentUser,
    session: DbSession,
    asset_id: UUID = Path(...),
) -> DataResponse[dict]:
    service = _service()
    try:
        data = await service.blast_radius(session, organization_id=user.organization_id, asset_id=asset_id)
    except Neo4jUnavailable as exc:
        raise HTTPException(status_code=503, detail={"neo4j": "unavailable", "message": exc.message})
    if not data.get("affected_assets"):
        raise HTTPException(status_code=404, detail="Asset not found or no reachable neighbours")
    return DataResponse(data=data)


@router.get("/critical-paths")
async def get_critical_paths(
    user: CurrentUser,
    session: DbSession,
    limit: int = 10,
) -> DataResponse[dict]:
    service = _service()
    paths = await service.critical_paths(session, organization_id=user.organization_id, limit=max(1, min(limit, 50)))
    serialized = [_serialize_path(p) for p in paths]
    return DataResponse(
        data={
            "count": len(serialized),
            "paths": serialized,
            "graph_source": "neo4j" if get_neo4j_service().is_available() else "fallback_inference",
        }
    )


def _serialize_path(p) -> dict:
    return {
        "id": p.id,
        "risk_score": p.risk_score,
        "risk_level": p.risk_level,
        "financial_exposure": p.financial_exposure,
        "expected_annual_loss": p.expected_annual_loss,
        "entry_point": p.entry_point,
        "target": p.target,
        "nodes": [n.__dict__ for n in p.nodes],
        "edges": [e.__dict__ for e in p.edges],
        "risk_drivers": list(p.risk_drivers),
        "affected_business_services": list(p.affected_business_services),
        "highest_value_asset": p.highest_value_asset,
        "critical_weakness": p.critical_weakness,
        "recommended_action": p.recommended_action,
        "hop_count": p.hop_count,
    }
