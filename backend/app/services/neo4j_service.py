"""Neo4j connection service.

Responsibilities:
  - lazily connect to Neo4j using settings
  - expose a singleton repository instance
  - wrap every repository call in a try/except that translates raw driver
    exceptions into Neo4jUnavailable so application code can degrade
    gracefully when graph is down
  - provide simple convenience methods for node/relationship creation and
    deletion on top of the repository
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Iterator
from uuid import UUID

from app.core.config import get_settings
from app.repositories.neo4j_repository import Neo4jRepository, Neo4jUnavailable

log = logging.getLogger(__name__)

MAX_TRAVERSAL_DEPTH: int = 6
ENTRY_POINT_LABELS = {
    "internet",
    "public",
    "vpn",
    "remote",
    "external",
    "internet_exposed",
    "public_application",
}


@dataclass
class GraphHealth:
    neo4j: str
    configured: bool
    message: str | None = None


class Neo4jService:
    """Lazy, safe Neo4j facade.

    The service does NOT crash the app when Neo4j is missing. Instead the
    underlying repository enters disabled mode and methods return
    clear-grained "unavailable" payloads or raise the typed
    ``Neo4jUnavailable`` for explicit callers.
    """

    def __init__(self, repository: Neo4jRepository | None = None) -> None:
        self._repository = repository
        self._connect_attempted = False
        self._last_connect_error: str | None = None

    # ------------------------------------------------------------------ #
    # Connection
    # ------------------------------------------------------------------ #
    def connect(self) -> Neo4jRepository:
        """Connect if needed, and return the repository for use."""
        if self._repository is not None:
            return self._repository
        settings = get_settings()
        self._connect_attempted = True
        if not settings.neo4j_uri:
            self._repository = Neo4jRepository(driver=None, max_depth=settings.neo4j_max_depth or MAX_TRAVERSAL_DEPTH)
            self._last_connect_error = "NEO4J_URI not configured"
            return self._repository
        if not settings.neo4j_password:
            self._repository = Neo4jRepository(driver=None, max_depth=settings.neo4j_max_depth or MAX_TRAVERSAL_DEPTH)
            self._last_connect_error = "NEO4J_PASSWORD not configured"
            return self._repository
        try:
            from neo4j import GraphDatabase  # type: ignore

            driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_username or "neo4j", settings.neo4j_password),
            )
            driver.verify_connectivity()
            self._repository = Neo4jRepository(
                driver=driver,
                max_depth=settings.neo4j_max_depth or MAX_TRAVERSAL_DEPTH,
            )
            self._last_connect_error = None
        except Exception as exc:  # pragma: no cover - depends on driver state
            log.warning("Neo4j connect failed: %s", exc)
            self._repository = Neo4jRepository(
                driver=None,
                max_depth=settings.neo4j_max_depth or MAX_TRAVERSAL_DEPTH,
            )
            self._last_connect_error = str(exc)
        return self._repository

    def is_available(self) -> bool:
        repo = self.connect()
        if repo.disabled:
            return False
        try:
            repo._run("RETURN 1 AS ok")  # noqa: SLF001 - ping only
            return True
        except Exception:
            return False

    def health(self) -> GraphHealth:
        repo = self.connect()
        if repo.disabled:
            return GraphHealth(
                neo4j="unavailable",
                configured=False,
                message=self._last_connect_error or "Graph disabled",
            )
        if self.is_available():
            return GraphHealth(neo4j="healthy", configured=True)
        return GraphHealth(
            neo4j="unavailable",
            configured=True,
            message=self._last_connect_error or "Ping failed",
        )

    @contextmanager
    def safe(self) -> Iterator[Neo4jRepository]:
        """Context manager yielding the configured repository.

        If the graph is unavailable ``Neo4jUnavailable`` is propagated.
        Callers that prefer a degraded payload should wrap their own
        exception handling.
        """
        repo = self.connect()
        if repo.disabled:
            raise Neo4jUnavailable(self._last_connect_error or "Graph disabled")
        try:
            yield repo
        except Neo4jUnavailable:
            raise
        except Exception as exc:  # pragma: no cover - driver-level failures
            log.warning("Neo4j operation failed: %s", exc)
            raise Neo4jUnavailable(str(exc)) from exc

    # ------------------------------------------------------------------ #
    # Convenience node/relationship ops
    # ------------------------------------------------------------------ #
    def create_asset_node(self, *, asset: Any, organization_id: UUID) -> None:
        with self.safe() as repo:
            repo.create_node(
                label="Asset",
                postgres_id=asset.id,
                organization_id=organization_id,
                properties={
                    "name": str(asset.name),
                    "asset_type": str(asset.asset_type.value if hasattr(asset.asset_type, "value") else asset.asset_type),
                    "criticality": int(getattr(asset, "criticality", 3) or 3),
                    "business_value": float(getattr(asset, "business_value", 0) or 0),
                    "exposure": str(getattr(asset, "exposure", "") or "").lower(),
                    "environment": str(getattr(asset, "environment", "") or "").lower(),
                    "description": str(getattr(asset, "description", "") or "")[:500],
                },
            )

    def create_vulnerability_node(self, *, vulnerability: Any, organization_id: UUID) -> None:
        with self.safe() as repo:
            repo.create_node(
                label="Vulnerability",
                postgres_id=vulnerability.id,
                organization_id=organization_id,
                properties={
                    "title": str(vulnerability.title),
                    "cve_id": str(getattr(vulnerability, "cve_id", "") or ""),
                    "cvss_score": float(getattr(vulnerability, "cvss_score", 0.0) or 0.0),
                    "exploitability": float(getattr(vulnerability, "exploitability", 0.0) or 0.0),
                    "severity": str(getattr(vulnerability, "severity", "low").value if hasattr(vulnerability.severity, "value") else getattr(vulnerability, "severity", "low")),
                    "remediation_status": str(getattr(vulnerability, "remediation_status", "open").value if hasattr(vulnerability.remediation_status, "value") else getattr(vulnerability, "remediation_status", "open")),
                    "asset_id": str(getattr(vulnerability, "asset_id", "")),
                },
            )
            if getattr(vulnerability, "asset_id", None):
                repo.create_relationship(
                    from_label="Vulnerability",
                    from_pid=vulnerability.id,
                    rel_type="AFFECTS",
                    to_label="Asset",
                    to_pid=vulnerability.asset_id,
                    properties={"cvss": float(getattr(vulnerability, "cvss_score", 0.0) or 0.0)},
                )

    def create_threat_node(self, *, threat: Any, organization_id: UUID) -> None:
        with self.safe() as repo:
            repo.create_node(
                label="Threat",
                postgres_id=threat.id,
                organization_id=organization_id,
                properties={
                    "name": str(threat.name),
                    "category": str(getattr(threat, "category", "") or ""),
                    "likelihood": float(getattr(threat, "likelihood", 0.0) or 0.0),
                    "sophistication": float(getattr(threat, "sophistication", 0.0) or 0.0),
                    "active": bool(getattr(threat, "active", True)),
                },
            )

    def create_control_node(self, *, control: Any, organization_id: UUID) -> None:
        with self.safe() as repo:
            repo.create_node(
                label="Control",
                postgres_id=control.id,
                organization_id=organization_id,
                properties={
                    "name": str(control.name),
                    "framework": str(getattr(control, "framework", "") or ""),
                    "category": str(getattr(control, "category", "") or ""),
                    "effectiveness": float(getattr(control, "effectiveness", 0.0) or 0.0),
                    "annual_cost": float(getattr(control, "annual_cost", 0.0) or 0.0),
                },
            )

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
        with self.safe() as repo:
            repo.create_relationship(
                from_label=from_label,
                from_pid=from_pid,
                rel_type=rel_type,
                to_label=to_label,
                to_pid=to_pid,
                properties=properties,
            )

    def delete_entity(self, *, label: str, postgres_id: UUID | str, organization_id: UUID | None = None) -> None:
        with self.safe() as repo:
            repo.delete_node(label=label, postgres_id=postgres_id, organization_id=organization_id)

    # Placeholder signatures for the sync methods, implemented by graph_sync_service.
    def sync_organization(self, *_args: Any, **_kwargs: Any) -> None:  # pragma: no cover
        raise NotImplementedError("Use graph_sync_service.sync_organization")

    def sync_asset(self, *_args: Any, **_kwargs: Any) -> None:  # pragma: no cover
        raise NotImplementedError("Use graph_sync_service.sync_asset")

    def sync_vulnerability(self, *_args: Any, **_kwargs: Any) -> None:  # pragma: no cover
        raise NotImplementedError("Use graph_sync_service.sync_vulnerability")

    def sync_threat(self, *_args: Any, **_kwargs: Any) -> None:  # pragma: no cover
        raise NotImplementedError("Use graph_sync_service.sync_threat")

    def sync_control(self, *_args: Any, **_kwargs: Any) -> None:  # pragma: no cover
        raise NotImplementedError("Use graph_sync_service.sync_control")

    def sync_all(self, *_args: Any, **_kwargs: Any) -> None:  # pragma: no cover
        raise NotImplementedError("Use graph_sync_service.sync_all")


@lru_cache
def get_neo4j_service() -> Neo4jService:
    return Neo4jService()
