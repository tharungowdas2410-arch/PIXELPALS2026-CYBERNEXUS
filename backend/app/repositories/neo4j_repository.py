"""Clean Neo4j repository abstraction.

Concrete driver calls live here. The rest of the application should only
import from this repository so the graph database implementation can be
swapped out without changing service code.

Parameterised Cypher queries only - no string interpolation of user input.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Iterable
from uuid import UUID

GraphRecord = dict[str, Any]


@dataclass
class Neo4jUnavailable(RuntimeError):
    """Raised when the driver is not reachable."""

    message: str = "Neo4j is not available or not configured"


class Neo4jRepository:
    """Repository with a pluggable driver instance.

    If no driver is supplied (neo4j optional dependency missing, or
    settings.neo4j_uri not configured) the repository enters a no-op mode
    and raises Neo4jUnavailable from calls that can't be serviced. This
    keeps Postgres phases 1-7 perfectly healthy.
    """

    def __init__(self, driver: Any | None = None, *, max_depth: int = 6) -> None:
        self.driver = driver
        self.max_depth = max_depth
        self.disabled = driver is None

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #
    def close(self) -> None:
        if self.driver is not None:
            try:
                self.driver.close()
            except Exception:  # pragma: no cover - best effort cleanup
                pass
            self.driver = None
            self.disabled = True

    def _session(self):  # pragma: no cover - exercised with driver in e2e only
        if self.disabled:
            raise Neo4jUnavailable
        return self.driver.session()

    def _run(self, query: str, parameters: dict[str, Any] | None = None) -> list[GraphRecord]:
        parameters = parameters or {}
        if self.disabled:
            raise Neo4jUnavailable
        with self._session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]

    # ------------------------------------------------------------------ #
    # Basic operations
    # ------------------------------------------------------------------ #
    def create_node(
        self,
        *,
        label: str,
        postgres_id: UUID | str,
        organization_id: UUID | str | None = None,
        properties: dict[str, Any] | None = None,
    ) -> None:
        props = dict(properties or {})
        props["postgres_id"] = str(postgres_id)
        if organization_id is not None:
            props["organization_id"] = str(organization_id)
        query = (
            f"MERGE (n:`{label}` {{postgres_id: $pid}}) "
            "SET n += $props "
            "RETURN count(n) AS c"
        )
        self._run(query, {"pid": props["postgres_id"], "props": props})

    def update_node(self, *, label: str, postgres_id: UUID | str, properties: dict[str, Any]) -> None:
        self.create_node(label=label, postgres_id=postgres_id, properties=properties)

    def delete_node(self, *, label: str, postgres_id: UUID | str, organization_id: UUID | str | None = None) -> None:
        query = f"MATCH (n:`{label}` {{postgres_id: $pid}}) DETACH DELETE n"
        params: dict[str, Any] = {"pid": str(postgres_id)}
        if organization_id is not None:
            query = f"MATCH (n:`{label}` {{postgres_id: $pid, organization_id: $oid}}) DETACH DELETE n"
            params["oid"] = str(organization_id)
        self._run(query, params)

    def delete_organization(self, *, organization_id: UUID | str) -> None:
        """Remove any graph entity linked to a Postgres organization id."""
        labels = [
            "Organization",
            "Asset",
            "Vulnerability",
            "Threat",
            "Control",
            "Identity",
            "BusinessService",
        ]
        for label in labels:
            try:
                self._run(
                    f"MATCH (n:`{label}` {{organization_id: $oid}}) DETACH DELETE n",
                    {"oid": str(organization_id)},
                )
            except Neo4jUnavailable:
                raise

    def create_relationship(
        self,
        *,
        from_label: str,
        from_pid: UUID | str,
        rel_type: str,
        to_label: str,
        to_pid: UUID | str,
        properties: dict[str, Any] | None = None,
    ) -> None:
        rel_type = rel_type.upper().replace(" ", "_").replace("-", "_")
        props = dict(properties or {})
        query = (
            f"MATCH (a:`{from_label}` {{postgres_id: $from_id}}), (b:`{to_label}` {{postgres_id: $to_id}}) "
            f"MERGE (a)-[r:`{rel_type}`]->(b) "
            "SET r += $props "
            "RETURN type(r)"
        )
        self._run(
            query,
            {
                "from_id": str(from_pid),
                "to_id": str(to_pid),
                "props": props,
            },
        )

    # ------------------------------------------------------------------ #
    # Graph queries
    # ------------------------------------------------------------------ #
    def get_neighbors(
        self,
        *,
        label: str,
        postgres_id: UUID | str,
        max_depth: int | None = None,
        direction: str = "both",
    ) -> list[GraphRecord]:
        depth = self.max_depth if max_depth is None else min(max_depth, self.max_depth)
        arrow = "-" if direction == "both" else ("<-" if direction == "in" else "-")
        direction_out = "-" if direction == "both" else ("->" if direction == "out" else "-")
        query = (
            f"MATCH p=(n:`{label}` {{postgres_id: $pid}}){arrow}[*1..{depth}]{direction_out}(m) "
            "RETURN [node IN nodes(p) | {postgres_id: node.postgres_id, labels: labels(node), props: properties(node)}] AS nodes, "
            "[rel IN relationships(p) | {type: type(rel), start: startNode(rel).postgres_id, end: endNode(rel).postgres_id, props: properties(rel)}] AS edges "
            "LIMIT 200"
        )
        return self._run(query, {"pid": str(postgres_id)})

    def find_paths(
        self,
        *,
        from_label: str,
        from_criteria: dict[str, Any],
        to_label: str,
        to_criteria: dict[str, Any],
        max_depth: int | None = None,
        limit: int = 25,
    ) -> list[GraphRecord]:
        """Generic path search between two node subsets (criteria = prop match)."""
        depth = self.max_depth if max_depth is None else min(max_depth, self.max_depth)
        from_where = " AND ".join(f"a.{k} = $from_{k}" for k in from_criteria.keys())
        to_where = " AND ".join(f"b.{k} = $to_{k}" for k in to_criteria.keys())
        params: dict[str, Any] = {}
        for k, v in from_criteria.items():
            params[f"from_{k}"] = v
        for k, v in to_criteria.items():
            params[f"to_{k}"] = v
        query = (
            f"MATCH p=(a:`{from_label}` {'WHERE ' + from_where if from_where else ''})"
            f"-[*1..{depth}]->(b:`{to_label}` {'WHERE ' + to_where if to_where else ''}) "
            "RETURN [node IN nodes(p) | {postgres_id: node.postgres_id, labels: labels(node), props: properties(node)}] AS nodes, "
            "[rel IN relationships(p) | {type: type(rel), start: startNode(rel).postgres_id, end: endNode(rel).postgres_id, props: properties(rel)}] AS edges, "
            "length(p) AS hop_count "
            f"ORDER BY hop_count ASC LIMIT {int(limit)}"
        )
        return self._run(query, params)

    def get_asset_graph(self, *, postgres_id: UUID | str) -> list[GraphRecord]:
        return self.get_neighbors(label="Asset", postgres_id=postgres_id, direction="both")

    def get_organization_assets(self, *, organization_id: UUID | str) -> list[GraphRecord]:
        query = (
            "MATCH (n:Asset {organization_id: $oid}) "
            "RETURN {postgres_id: n.postgres_id, labels: labels(n), props: properties(n)} AS node "
            "ORDER BY n.name ASC"
        )
        return self._run(query, {"oid": str(organization_id)})

    def list_relationships(self, *, organization_id: UUID | str) -> list[GraphRecord]:
        query = (
            "MATCH (a)-[r]->(b) "
            "WHERE a.organization_id = $oid AND b.organization_id = $oid "
            "RETURN {type: type(r), start: a.postgres_id, end: b.postgres_id, props: properties(r)} AS edge "
            "LIMIT 1000"
        )
        return self._run(query, {"oid": str(organization_id)})

    def run_cypher(self, query: str, parameters: dict[str, Any] | None = None) -> list[GraphRecord]:
        """Restricted to pre-vetted queries from services; never user-provided Cypher."""
        return self._run(query, parameters or {})
