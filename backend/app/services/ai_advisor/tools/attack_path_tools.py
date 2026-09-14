"""Attack path and blast radius tools using Neo4j and graph sync engine."""

from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai_advisor.citations import CitationCollector
from app.services.attack_path_service import AttackPathService


async def get_attack_paths(
    session: AsyncSession,
    organization_id: UUID,
    asset_id: UUID | None = None,
    severity: str | None = None,
    limit: int = 5,
    collector: CitationCollector | None = None,
) -> dict:
    """Discovers attack paths between entry-point assets and critical high-value services."""
    service = AttackPathService()
    result = await service.discover_attack_paths(
        session,
        organization_id,
        severity=severity,
        target_asset_id=asset_id,
        limit=limit,
    )
    paths = result.get("paths", [])
    output_paths = []
    for p in paths[:limit]:
        pid = p.get("id") or "path"
        name = p.get("name") or "Attack Path"
        score = p.get("risk_score", 0.0)
        nodes = p.get("nodes", [])
        exposure = p.get("financial_exposure", 0.0)
        node_labels = [n.get("label") for n in nodes if isinstance(n, dict)]
        output_paths.append({
            "id": pid,
            "name": name,
            "risk_score": score,
            "risk_level": p.get("risk_level", "HIGH"),
            "hops": p.get("hops", len(nodes) - 1),
            "node_chain": " → ".join(node_labels),
            "entry_point": node_labels[0] if node_labels else "Internet",
            "target": node_labels[-1] if node_labels else "Internal Service",
            "financial_exposure": exposure,
            "remediation_points": p.get("recommended_remediations", []),
        })
        if collector:
            collector.add(
                source_type="attack_path",
                source_id=str(pid),
                description=f"Attack path {name} (Risk: {score:.1f}, Chain: {' → '.join(node_labels)})",
                metadata={"risk_score": score, "nodes": node_labels},
            )

    return {
        "paths": output_paths,
        "total_paths_discovered": result.get("count", len(output_paths)),
        "graph_source": result.get("graph_source", "inferred_graph"),
        "illustrative": True,
    }


async def get_blast_radius(
    session: AsyncSession,
    organization_id: UUID,
    asset_id: UUID,
    collector: CitationCollector | None = None,
) -> dict:
    """Calculates downstream blast radius and affected assets if an asset is compromised."""
    service = AttackPathService()
    result = await service.get_blast_radius(session, organization_id, asset_id)
    if collector and "root_asset" in result:
        root_name = result["root_asset"].get("name", str(asset_id))
        collector.add(
            source_type="blast_radius",
            source_id=str(asset_id),
            description=f"Blast radius analysis for {root_name} (Downstream assets: {len(result.get('affected_assets', []))})",
            metadata={"affected_count": len(result.get("affected_assets", []))},
        )
    return result
