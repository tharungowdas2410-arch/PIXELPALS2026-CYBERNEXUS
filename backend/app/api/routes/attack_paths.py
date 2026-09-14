"""Attack-path API routes — list and detail routes with graph-derived paths."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, Query

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.enums import UserRole
from app.repositories.neo4j_repository import Neo4jUnavailable
from app.schemas.common import DataResponse
from app.services.attack_path_service import AttackPathService, get_attack_path_service
from app.services.neo4j_service import get_neo4j_service

router = APIRouter(prefix="/attack-paths", tags=["attack-paths"])


def _service() -> AttackPathService:
    return get_attack_path_service()


@router.get("")
async def get_paths(
    user: CurrentUser,
    session: DbSession,
    limit: int = Query(25, ge=1, le=100),
) -> DataResponse[dict]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.SECURITY_ANALYST,
        UserRole.RISK_MANAGER,
    )(user)
    try:
        paths = await _service().discover_paths(
            session,
            organization_id=user.organization_id,
            limit=limit,
        )
    except Neo4jUnavailable as exc:
        raise HTTPException(status_code=503, detail={"neo4j": "unavailable", "message": exc.message})
    serialized = [_serialize(p) for p in paths]
    return DataResponse(
        data={
            "count": len(serialized),
            "paths": serialized,
            "graph_source": "neo4j" if get_neo4j_service().is_available() else "fallback_inference",
            "scoring_formula": (
                "node_risk = crit_norm * (0.4 + 0.35*cvss + 0.25*exploit) * threat_boost "
                "* (0.5+0.5*exposure) * (0.6+0.4*control_adj); "
                "path = L^1.2 mean × length_penalty × business_boost"
            ),
            "financial_engine": "reused calculate_eal() from financial_engine.py",
        }
    )


@router.get("/{path_id}")
async def get_path_detail(
    user: CurrentUser,
    session: DbSession,
    path_id: str = Path(..., min_length=1),
) -> DataResponse[dict]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.SECURITY_ANALYST,
        UserRole.RISK_MANAGER,
    )(user)
    try:
        p = await _service().get_path_by_id(
            session,
            organization_id=user.organization_id,
            path_id=path_id,
        )
    except Neo4jUnavailable as exc:
        raise HTTPException(status_code=503, detail={"neo4j": "unavailable", "message": exc.message})
    if p is None:
        raise HTTPException(status_code=404, detail=f"Attack path {path_id} not found")
    serialized = _serialize(p)
    # "Why is this path dangerous?" explanation block
    entry_node = next((n for n in p.nodes if n.postgres_id == p.entry_point), None)
    target_node = next((n for n in p.nodes if n.postgres_id == p.target), None)
    why = [
        f"This path begins at the {entry_node.label if entry_node else p.entry_point} "
        f"and reaches {target_node.label if target_node else p.target} "
        f"over {p.hop_count} hops.",
        f"Primary risk drivers: {'; '.join(p.risk_drivers[:3])}.",
        "Primary controls to break the path are shown in the recommended action.",
    ]
    serialized["explanation"] = why
    return DataResponse(data=serialized)


def _serialize(p) -> dict:
    return {
        "id": p.id,
        "name": (
            f"{p.nodes[0].label} → {p.nodes[-1].label}"
            if p.nodes else p.id
        ),
        "risk_score": p.risk_score,
        "risk_level": p.risk_level,
        "financial_exposure": p.financial_exposure,
        "expected_annual_loss": p.expected_annual_loss,
        "entry_point": p.entry_point,
        "entry_point_label": p.nodes[0].label if p.nodes else None,
        "target": p.target,
        "target_label": p.nodes[-1].label if p.nodes else None,
        "nodes": [n.__dict__ for n in p.nodes],
        "edges": [e.__dict__ for e in p.edges],
        "risk_drivers": list(p.risk_drivers),
        "critical_weakness": p.critical_weakness,
        "recommended_action": p.recommended_action,
        "affected_business_services": list(p.affected_business_services),
        "highest_value_asset": p.highest_value_asset,
        "hop_count": p.hop_count,
        "assets_in_path": list(p.assets_in_path),
    }
