"""Graph Sync Service.

Translates PostgreSQL entities into the Neo4j graph model.

MERGE semantics are used throughout so running sync multiple times is idempotent:
- no duplicate nodes are created, and no duplicate relationships.

Postgres UUIDs are stored as ``postgres_id`` on Neo4j nodes so
identities never diverge across the two stores.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.control import Control
from app.models.organization import Organization
from app.models.threat import Threat
from app.models.vulnerability import Vulnerability
from app.repositories.neo4j_repository import Neo4jUnavailable
from app.services.neo4j_service import Neo4jService, get_neo4j_service

log = logging.getLogger(__name__)


@dataclass
class SyncReport:
    organization_id: UUID
    organizations: int = 0
    assets: int = 0
    vulnerabilities: int = 0
    threats: int = 0
    controls: int = 0
    relationships: int = 0
    errors: list[str] | None = None
    graph_available: bool = True


class GraphSyncService:
    def __init__(self, neo4j: Neo4jService | None = None) -> None:
        self.neo4j = neo4j or get_neo4j_service()

    # ------------------------------------------------------------------ #
    # Individual sync primitives
    # ------------------------------------------------------------------ #
    async def sync_organization(self, session: AsyncSession, organization_id: UUID) -> SyncReport:
        report = SyncReport(organization_id=organization_id)
        org = await session.get(Organization, organization_id)
        if org is None:
            report.errors = [f"Organization {organization_id} not found"]
            return report
        try:
            with self.neo4j.safe() as repo:
                repo.create_node(
                    label="Organization",
                    postgres_id=org.id,
                    organization_id=org.id,
                    properties={
                        "name": org.name,
                        "industry": str(getattr(org, "industry", "") or ""),
                        "security_budget": float(getattr(org, "security_budget", 0) or 0),
                    },
                )
            report.organizations = 1
        except Neo4jUnavailable as exc:
            report.graph_available = False
            report.errors = [exc.message]
            return report
        try:
            asset_ids = await self._sync_assets(session, organization_id, report)
            await self._sync_vulnerabilities(session, organization_id, asset_ids, report)
            await self._sync_threats(session, organization_id, report)
            await self._sync_controls(session, organization_id, report)
            await self._infer_asset_relationships(session, report, organization_id, asset_ids)
        except Neo4jUnavailable as exc:
            report.graph_available = False
            report.errors = report.errors or []
            report.errors.append(exc.message)
        return report

    async def sync_asset(self, session: AsyncSession, organization_id: UUID, asset_id: UUID) -> SyncReport:
        report = SyncReport(organization_id=organization_id)
        asset = await session.get(Asset, asset_id)
        if asset is None:
            report.errors = [f"Asset {asset_id} not found"]
            return report
        try:
            self.neo4j.create_asset_node(asset=asset, organization_id=organization_id)
            report.assets = 1
        except Neo4jUnavailable as exc:
            report.graph_available = False
            report.errors = [exc.message]
            return report
        # Vulns for asset
        vulns = (await session.scalars(select(Vulnerability).where(Vulnerability.asset_id == asset_id))).all()
        for v in vulns:
            try:
                self.neo4j.create_vulnerability_node(vulnerability=v, organization_id=organization_id)
                report.vulnerabilities += 1
            except Neo4jUnavailable:
                report.graph_available = False
                break
        return report

    async def sync_vulnerability(
        self, session: AsyncSession, organization_id: UUID, vulnerability_id: UUID
    ) -> SyncReport:
        report = SyncReport(organization_id=organization_id)
        v = await session.get(Vulnerability, vulnerability_id)
        if v is None:
            report.errors = [f"Vulnerability {vulnerability_id} not found"]
            return report
        try:
            self.neo4j.create_vulnerability_node(vulnerability=v, organization_id=organization_id)
            report.vulnerabilities = 1
        except Neo4jUnavailable as exc:
            report.graph_available = False
            report.errors = [exc.message]
        return report

    async def sync_threat(self, session: AsyncSession, organization_id: UUID, threat_id: UUID) -> SyncReport:
        report = SyncReport(organization_id=organization_id)
        t = await session.get(Threat, threat_id)
        if t is None:
            report.errors = [f"Threat {threat_id} not found"]
            return report
        try:
            self.neo4j.create_threat_node(threat=t, organization_id=organization_id)
            report.threats = 1
        except Neo4jUnavailable as exc:
            report.graph_available = False
            report.errors = [exc.message]
        return report

    async def sync_control(self, session: AsyncSession, organization_id: UUID, control_id: UUID) -> SyncReport:
        report = SyncReport(organization_id=organization_id)
        c = await session.get(Control, control_id)
        if c is None:
            report.errors = [f"Control {control_id} not found"]
            return report
        try:
            self.neo4j.create_control_node(control=c, organization_id=organization_id)
            report.controls = 1
        except Neo4jUnavailable as exc:
            report.graph_available = False
            report.errors = [exc.message]
        return report

    async def sync_all(self, session: AsyncSession, organization_id: UUID) -> SyncReport:
        return await self.sync_organization(session, organization_id)

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    async def _sync_assets(
        self, session: AsyncSession, organization_id: UUID, report: SyncReport
    ) -> dict[UUID, Asset]:
        stmt = select(Asset).where(Asset.organization_id == organization_id)
        assets = (await session.scalars(stmt)).all()
        with self.neo4j.safe() as repo:
            for asset in assets:
                repo.create_node(
                    label="Asset",
                    postgres_id=asset.id,
                    organization_id=organization_id,
                    properties={
                        "name": asset.name,
                        "asset_type": str(asset.asset_type.value if hasattr(asset.asset_type, "value") else asset.asset_type),
                        "criticality": int(asset.criticality or 3),
                        "business_value": float(asset.business_value or 0),
                        "exposure": str(asset.exposure or "").lower(),
                        "environment": str(asset.environment or "").lower(),
                        "organization_id": str(organization_id),
                    },
                )
                # BELONGS_TO the organization
                repo.create_relationship(
                    from_label="Asset",
                    from_pid=asset.id,
                    rel_type="BELONGS_TO",
                    to_label="Organization",
                    to_pid=organization_id,
                )
                report.assets += 1
                report.relationships += 1
        return {a.id: a for a in assets}

    async def _sync_vulnerabilities(
        self,
        session: AsyncSession,
        organization_id: UUID,
        asset_ids: dict[UUID, Any],
        report: SyncReport,
    ) -> None:
        if not asset_ids:
            return
        stmt = select(Vulnerability).where(Vulnerability.asset_id.in_(list(asset_ids.keys())))
        vulns = (await session.scalars(stmt)).all()
        with self.neo4j.safe() as repo:
            for v in vulns:
                repo.create_node(
                    label="Vulnerability",
                    postgres_id=v.id,
                    organization_id=organization_id,
                    properties={
                        "title": v.title,
                        "cve_id": str(v.cve_id or ""),
                        "cvss_score": float(v.cvss_score or 0.0),
                        "exploitability": float(v.exploitability or 0.0),
                        "severity": str(v.severity.value if hasattr(v.severity, "value") else v.severity),
                        "remediation_status": str(
                            v.remediation_status.value if hasattr(v.remediation_status, "value") else v.remediation_status
                        ),
                    },
                )
                repo.create_relationship(
                    from_label="Vulnerability",
                    from_pid=v.id,
                    rel_type="AFFECTS",
                    to_label="Asset",
                    to_pid=v.asset_id,
                    properties={"cvss": float(v.cvss_score or 0.0), "exploitability": float(v.exploitability or 0.0)},
                )
                report.vulnerabilities += 1
                report.relationships += 1

    async def _sync_threats(self, session: AsyncSession, organization_id: UUID, report: SyncReport) -> None:
        stmt = select(Threat)
        threats = (await session.scalars(stmt)).all()
        with self.neo4j.safe() as repo:
            for t in threats:
                repo.create_node(
                    label="Threat",
                    postgres_id=t.id,
                    organization_id=organization_id,
                    properties={
                        "name": t.name,
                        "category": str(t.category or ""),
                        "likelihood": float(t.likelihood or 0.0),
                        "sophistication": float(t.sophistication or 0.0),
                        "active": bool(t.active),
                    },
                )
                report.threats += 1
                # Blindly target assets with matching likelihood; the threat↔asset link is
                # directional to allow future per-asset mapping if we extend the data model
                # later.
            # TARGETS edge to organization-level only, keeping our demo footprint small.
                repo.create_relationship(
                    from_label="Threat",
                    from_pid=t.id,
                    rel_type="TARGETS",
                    to_label="Organization",
                    to_pid=organization_id,
                    properties={"likelihood": float(t.likelihood or 0.0)},
                )
                report.relationships += 1

    async def _sync_controls(self, session: AsyncSession, organization_id: UUID, report: SyncReport) -> None:
        stmt = select(Control).where(Control.organization_id == organization_id)
        controls = (await session.scalars(stmt)).all()
        with self.neo4j.safe() as repo:
            for c in controls:
                repo.create_node(
                    label="Control",
                    postgres_id=c.id,
                    organization_id=organization_id,
                    properties={
                        "name": c.name,
                        "framework": str(c.framework or ""),
                        "category": str(c.category or ""),
                        "effectiveness": float(c.effectiveness or 0.0),
                        "annual_cost": float(c.annual_cost or 0.0),
                    },
                )
                repo.create_relationship(
                    from_label="Control",
                    from_pid=c.id,
                    rel_type="PROTECTS",
                    to_label="Organization",
                    to_pid=organization_id,
                    properties={"effectiveness": float(c.effectiveness or 0.0)},
                )
                report.controls += 1
                report.relationships += 1

    async def _infer_asset_relationships(
        self,
        session: AsyncSession,
        report: SyncReport,
        organization_id: UUID,
        asset_ids: dict[UUID, Any],
    ) -> None:
        """Enterprise inference rules (all MERGE → idempotent.

        We look for a conventional app-server → database
        apps with name contains "app" / "svc" → identity
        vpn → idp
        everything critical → payment service
        backup server ← depends_on from databases
        """
        assets = list(asset_ids.values())
        vpn_assets = [a for a in assets if "vpn" in (a.name or "").lower() or "remote" in (a.name or "").lower()]
        idp_assets = [a for a in assets if any(t in (a.name or "").lower() for t in ("identity", "idp", "auth", "sso"))]
        app_assets = [a for a in assets if any(t in (a.name or "").lower() for t in ("app", "svc", "service", "api")) and a not in idp_assets]
        db_assets = [a for a in assets if any(t in (a.name or "").lower() for t in ("database", "db", "postgres", "mysql", "sql"))]
        payment_assets = [a for a in assets if "payment" in (a.name or "").lower()]
        backup_assets = [a for a in assets if any(t in (a.name or "").lower() for t in ("backup", "snapshot"))]

        with self.neo4j.safe() as repo:
            def _edge(src, rel, dst, props=None):
                if src is None or dst is None or src.id == dst.id:
                    return
                repo.create_relationship(
                    from_label="Asset",
                    from_pid=src.id,
                    rel_type=rel,
                    to_label="Asset",
                    to_pid=dst.id,
                    properties=props or {},
                )
                report.relationships += 1

            for vpn in vpn_assets:
                for idp in idp_assets:
                    _edge(vpn, "CONNECTS_TO", idp, {"exposure": "external"})
            for idp in idp_assets:
                for app in app_assets:
                    _edge(idp, "CAN_ACCESS", app, {"auth": "sso"})
            for app in app_assets:
                for db in db_assets:
                    _edge(app, "DEPENDS_ON", db, {"protocol": "sql"})
                for payment in payment_assets:
                    if app not in payment_assets:
                        _edge(app, "SUPPORTS", payment)
            for db in db_assets:
                for payment in payment_assets:
                    if db not in payment_assets:
                        _edge(payment, "DEPENDS_ON", db, {"data": "pci"})
            for db in db_assets:
                for backup in backup_assets:
                    _edge(db, "HOSTS", backup, {"protection": "backup"})
            for payment in payment_assets:
                for backup in backup_assets:
                    _edge(payment, "DEPENDS_ON", backup, {"protection": "dr"})
            # Criticality based dependency chain
            high_crit = [a for a in assets if a.criticality is not None and int(a.criticality) >= 4]
            for target in payment_assets:
                for src in high_crit:
                    if src.id != target.id and src not in payment_assets:
                        _edge(src, "CONNECTS_TO", target, {"critical_path": True})
