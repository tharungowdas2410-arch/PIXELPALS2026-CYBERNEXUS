"""Load illustrative demo data for CYBERNEXUS PHASE 1.

Financial figures are prototype values, not booked losses.
"""

from __future__ import annotations

import asyncio
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.asset import Asset
from app.models.control import Control
from app.models.enums import (
    AssetType,
    ImplementationStatus,
    RemediationStatus,
    Severity,
    UserRole,
)
from app.models.organization import Organization
from app.models.threat import Threat
from app.models.user import User
from app.models.vulnerability import Vulnerability


async def seed() -> None:
    async with SessionLocal() as session:
        existing = await session.scalar(select(Organization).where(Organization.name == "Northbridge Holdings"))
        if existing:
            await seed_extended(session, existing)
            await session.commit()
            print("Demo organization already exists; filled any missing PHASE 2+ rows.")
            print(f"Admin login: {settings.seed_admin_email}")
            return

        org = Organization(
            name="Northbridge Holdings",
            industry="financial_services",
            country="IN",
            security_budget=85_000_000,
            description="Illustrative financial-services tenant for SIH 26105.",
        )
        session.add(org)
        await session.flush()

        session.add_all(
            [
                User(
                    organization_id=org.id,
                    email=settings.seed_admin_email.lower(),
                    password_hash=hash_password(settings.seed_admin_password),
                    full_name="A. Mehta",
                    role=UserRole.CISO,
                ),
                User(
                    organization_id=org.id,
                    email="analyst@northbridge.example",
                    password_hash=hash_password(settings.seed_admin_password),
                    full_name="R. Iyer",
                    role=UserRole.SECURITY_ANALYST,
                ),
            ]
        )

        assets = {
            "vpn": Asset(
                organization_id=org.id,
                name="Internet-facing VPN",
                asset_type=AssetType.NETWORK_DEVICE,
                owner="Network",
                environment="production",
                criticality=5,
                business_value=11_200_000,
                exposure="internet",
                data_sensitivity="high",
                confidentiality_requirement="high",
            ),
            "idp": Asset(
                organization_id=org.id,
                name="Identity Provider",
                asset_type=AssetType.IDENTITY,
                owner="IAM",
                environment="production",
                criticality=5,
                business_value=9_800_000,
                exposure="internal",
            ),
            "web": Asset(
                organization_id=org.id,
                name="Customer Web Application",
                asset_type=AssetType.APPLICATION,
                owner="AppSec",
                environment="production",
                criticality=4,
                business_value=8_700_000,
                exposure="internet",
            ),
            "db": Asset(
                organization_id=org.id,
                name="Customer Database",
                asset_type=AssetType.DATABASE,
                owner="Data",
                environment="production",
                criticality=5,
                business_value=15_000_000,
                exposure="internal",
                data_sensitivity="critical",
            ),
            "pay": Asset(
                organization_id=org.id,
                name="Payment Service",
                asset_type=AssetType.BUSINESS_SERVICE,
                owner="Payments",
                environment="production",
                criticality=5,
                business_value=18_000_000,
                exposure="internal",
            ),
            "backup": Asset(
                organization_id=org.id,
                name="Backup Server",
                asset_type=AssetType.SERVER,
                owner="Infrastructure",
                environment="production",
                criticality=4,
                business_value=4_100_000,
                exposure="internal",
            ),
        }
        session.add_all(assets.values())
        await session.flush()

        now = datetime.now(UTC)
        vulns = [
            Vulnerability(
                asset_id=assets["vpn"].id,
                cve_id="CVE-2024-21887",
                title="VPN auth bypass",
                cvss_score=9.1,
                exploitability=0.9,
                severity=Severity.CRITICAL,
                remediation_status=RemediationStatus.OPEN,
                discovered_at=now - timedelta(days=18),
            ),
            Vulnerability(
                asset_id=assets["vpn"].id,
                cve_id="CVE-2026-18421",
                title="VPN session fixation",
                cvss_score=8.2,
                exploitability=0.7,
                severity=Severity.HIGH,
                remediation_status=RemediationStatus.IN_PROGRESS,
                discovered_at=now - timedelta(days=9),
            ),
            Vulnerability(
                asset_id=assets["idp"].id,
                cve_id="CVE-2024-10914",
                title="IdP MFA enrollment gap",
                cvss_score=7.5,
                exploitability=0.6,
                severity=Severity.HIGH,
                remediation_status=RemediationStatus.OPEN,
            ),
            Vulnerability(
                asset_id=assets["web"].id,
                cve_id="CVE-2023-44487",
                title="HTTP/2 rapid reset",
                cvss_score=7.5,
                exploitability=0.5,
                severity=Severity.HIGH,
                remediation_status=RemediationStatus.MITIGATED,
            ),
            Vulnerability(
                asset_id=assets["db"].id,
                cve_id="CVE-2023-38545",
                title="Database driver overflow",
                cvss_score=9.8,
                exploitability=0.4,
                severity=Severity.CRITICAL,
                remediation_status=RemediationStatus.OPEN,
            ),
            Vulnerability(
                asset_id=assets["pay"].id,
                cve_id=None,
                title="Weak service-to-service auth",
                cvss_score=8.0,
                exploitability=0.55,
                severity=Severity.HIGH,
                remediation_status=RemediationStatus.OPEN,
            ),
            Vulnerability(
                asset_id=assets["backup"].id,
                cve_id="CVE-2022-30525",
                title="Backup console RCE",
                cvss_score=8.6,
                exploitability=0.35,
                severity=Severity.HIGH,
                remediation_status=RemediationStatus.ACCEPTED,
            ),
            Vulnerability(
                asset_id=assets["web"].id,
                cve_id="CVE-2021-44228",
                title="Log4Shell residual library",
                cvss_score=10.0,
                exploitability=0.3,
                severity=Severity.CRITICAL,
                remediation_status=RemediationStatus.MITIGATED,
            ),
            Vulnerability(
                asset_id=assets["idp"].id,
                cve_id=None,
                title="Stale privileged role assignments",
                cvss_score=6.5,
                exploitability=0.45,
                severity=Severity.MEDIUM,
                remediation_status=RemediationStatus.OPEN,
            ),
            Vulnerability(
                asset_id=assets["db"].id,
                cve_id=None,
                title="Over-permissive database role",
                cvss_score=7.1,
                exploitability=0.5,
                severity=Severity.HIGH,
                remediation_status=RemediationStatus.IN_PROGRESS,
            ),
        ]
        session.add_all(vulns)

        threats = [
            Threat(name="Ransomware affiliate", category="ransomware", likelihood=0.55, sophistication=0.8, active=True),
            Threat(name="Credential stuffing", category="identity", likelihood=0.7, sophistication=0.4, active=True),
            Threat(name="VPN exploitation", category="network", likelihood=0.48, sophistication=0.7, active=True),
            Threat(name="Insider privilege abuse", category="insider", likelihood=0.22, sophistication=0.5, active=True),
            Threat(name="Supply-chain implant", category="supply_chain", likelihood=0.18, sophistication=0.9, active=True),
            Threat(name="DDoS extortion", category="availability", likelihood=0.3, sophistication=0.3, active=False),
        ]
        session.add_all(threats)

        controls = [
            Control(organization_id=org.id, name="Privileged MFA", framework="NIST CSF", category="identity", effectiveness=0.45, implementation_status=ImplementationStatus.PARTIAL, annual_cost=1_200_000),
            Control(organization_id=org.id, name="EDR coverage", framework="CIS Controls", category="endpoint", effectiveness=0.6, implementation_status=ImplementationStatus.PARTIAL, annual_cost=2_400_000),
            Control(organization_id=org.id, name="Immutable backups", framework="ISO 27001", category="recovery", effectiveness=0.7, implementation_status=ImplementationStatus.IMPLEMENTED, annual_cost=1_800_000),
            Control(organization_id=org.id, name="Network segmentation", framework="RBI", category="network", effectiveness=0.4, implementation_status=ImplementationStatus.PARTIAL, annual_cost=3_100_000),
            Control(organization_id=org.id, name="WAF", framework="ISO 27001", category="application", effectiveness=0.55, implementation_status=ImplementationStatus.IMPLEMENTED, annual_cost=900_000),
            Control(organization_id=org.id, name="PAM", framework="NIST CSF", category="identity", effectiveness=0.35, implementation_status=ImplementationStatus.PLANNED, annual_cost=2_200_000),
            Control(organization_id=org.id, name="CSPM", framework="CIS Controls", category="cloud", effectiveness=0.3, implementation_status=ImplementationStatus.PLANNED, annual_cost=1_100_000),
            Control(organization_id=org.id, name="Vulnerability SLA tracking", framework="SEBI", category="vulnerability", effectiveness=0.5, implementation_status=ImplementationStatus.PARTIAL, annual_cost=400_000),
        ]
        session.add_all(controls)
        await session.flush()
        await seed_extended(session, org)
        await session.commit()
        print("Seeded Northbridge Holdings demo tenant.")
        print(f"Admin login: {settings.seed_admin_email}")


async def seed_extended(session, org: Organization) -> None:
    from sqlalchemy import func

    from app.models.attack_path import AttackPath
    from app.models.blockchain_evidence import BlockchainEvidence
    from app.models.compliance import ComplianceRecord
    from app.models.enums import ComplianceStatus, IncidentStatus, RiskStatus, VerificationStatus
    from app.models.financial_risk import FinancialRisk
    from app.models.incident import Incident
    from app.models.investment import Investment
    from app.models.risk import Risk
    from app.services.blockchain_service import hash_payload, simulate_transaction_hash
    from app.services.financial_engine import calculate_eal
    from app.services.risk_engine import quantify_risk
    from app.utils.calculations import rosi

    risk_count = await session.scalar(select(func.count()).select_from(Risk).where(Risk.organization_id == org.id))
    assets = list(await session.scalars(select(Asset).where(Asset.organization_id == org.id)))
    vulns = list(await session.scalars(select(Vulnerability).join(Asset).where(Asset.organization_id == org.id)))
    threats = list(await session.scalars(select(Threat)))
    controls = list(await session.scalars(select(Control).where(Control.organization_id == org.id)))
    if not assets:
        return

    by_name = {item.name: item for item in assets}
    if not risk_count:
        pairs = list(zip(vulns, threats, controls)) or []
        now = datetime.now(UTC)
        for index, vuln in enumerate(vulns):
            asset = next((item for item in assets if item.id == vuln.asset_id), assets[0])
            threat = threats[index % len(threats)] if threats else None
            control = controls[index % len(controls)] if controls else None
            effectiveness = control.effectiveness if control else 0.2
            likelihood = threat.likelihood if threat else 0.4
            impact = min(1.0, 0.45 + asset.criticality * 0.1)
            scored = quantify_risk(
                likelihood=likelihood,
                impact=impact,
                criticality=asset.criticality,
                exploitability=vuln.exploitability,
                control_effectiveness=effectiveness,
                exposure=asset.exposure,
                threat_likelihood=threat.likelihood if threat else None,
                threat_sophistication=threat.sophistication if threat else None,
                implementation_status=control.implementation_status.value if control else None,
                vulnerability_severity=vuln.severity.value,
                data_sensitivity=asset.data_sensitivity,
            )
            money = calculate_eal(
                likelihood=likelihood,
                asset_business_value=float(asset.business_value),
                impact=impact,
            )
            risk = Risk(
                organization_id=org.id,
                asset_id=asset.id,
                vulnerability_id=vuln.id,
                threat_id=threat.id if threat else None,
                control_id=control.id if control else None,
                likelihood=likelihood,
                impact=impact,
                risk_score=scored.inherent_risk,
                residual_risk=scored.residual_risk,
                financial_exposure=float(money["probable_maximum_loss"]),
                expected_annual_loss=float(money["estimated_annual_loss"]),
                status=RiskStatus.OPEN,
                calculated_at=now,
                explanation=scored.explanation,
                drivers=scored.drivers,
                factors=[
                    {
                        "key": item.key,
                        "label": item.label,
                        "value": item.value,
                        "normalized": item.normalized,
                        "source": item.source,
                        "explanation": item.explanation,
                    }
                    for item in scored.factors
                ],
                formula_trace=scored.formula_trace,
            )
            session.add(risk)
            await session.flush()
            session.add(
                FinancialRisk(
                    organization_id=org.id,
                    risk_id=risk.id,
                    expected_loss=float(money["estimated_annual_loss"]),
                    min_loss=float(money["probable_minimum_loss"]),
                    max_loss=float(money["probable_maximum_loss"]),
                    confidence_level=0.8,
                    var_value=float(money["probable_maximum_loss"]),
                    annualized_loss=float(money["estimated_annual_loss"]),
                    calculation_method="illustrative_eal",
                )
            )

    if not await session.scalar(select(func.count()).select_from(Investment).where(Investment.organization_id == org.id)):
        for index, control in enumerate(controls, start=1):
            cost = float(control.annual_cost)
            avoided = round(cost * (1.2 + control.effectiveness), 2)
            session.add(
                Investment(
                    organization_id=org.id,
                    control_id=control.id,
                    name=control.name,
                    category=control.category,
                    cost=cost,
                    estimated_risk_reduction=round(control.effectiveness * 25, 2),
                    estimated_loss_avoided=avoided,
                    rosi=rosi(avoided, cost) or 0,
                    priority=index,
                    recommended=index <= 4,
                )
            )

    if not await session.scalar(select(func.count()).select_from(Incident).where(Incident.organization_id == org.id)):
        now = datetime.now(UTC)
        session.add_all(
            [
                Incident(
                    organization_id=org.id,
                    title="Privileged credential stuffing on VPN",
                    severity=Severity.HIGH,
                    status=IncidentStatus.CONTAINED,
                    detected_at=now - timedelta(days=6),
                    estimated_loss=1_800_000,
                    affected_assets=[str(by_name["Internet-facing VPN"].id)] if "Internet-facing VPN" in by_name else [],
                    description="Illustrative credential-stuffing event blocked after MFA challenge.",
                ),
                Incident(
                    organization_id=org.id,
                    title="Attempted ransomware staging on file server",
                    severity=Severity.CRITICAL,
                    status=IncidentStatus.INVESTIGATING,
                    detected_at=now - timedelta(days=2),
                    estimated_loss=4_200_000,
                    affected_assets=[str(by_name["Backup Server"].id)] if "Backup Server" in by_name else [],
                ),
            ]
        )

    if not await session.scalar(select(func.count()).select_from(ComplianceRecord).where(ComplianceRecord.organization_id == org.id)):
        session.add_all(
            [
                ComplianceRecord(organization_id=org.id, framework="NIST CSF", requirement="PR.AC-1 identity management", status=ComplianceStatus.PARTIAL, score=68, evidence="Privileged MFA incomplete"),
                ComplianceRecord(organization_id=org.id, framework="ISO 27001", requirement="A.8.13 backups", status=ComplianceStatus.COMPLIANT, score=88, evidence="Immutable backup restore test"),
                ComplianceRecord(organization_id=org.id, framework="RBI", requirement="Network segmentation of payment VLAN", status=ComplianceStatus.PARTIAL, score=61),
                ComplianceRecord(organization_id=org.id, framework="SEBI", requirement="Vulnerability SLA for critical CVEs", status=ComplianceStatus.NON_COMPLIANT, score=44),
            ]
        )

    if not await session.scalar(select(func.count()).select_from(AttackPath).where(AttackPath.organization_id == org.id)):
        node_assets = [
            by_name.get("Internet-facing VPN"),
            by_name.get("Identity Provider"),
            by_name.get("Customer Web Application"),
            by_name.get("Customer Database"),
            by_name.get("Payment Service"),
        ]
        nodes = []
        for item in node_assets:
            if item:
                kind = "asset"
                if item.asset_type.value == "identity":
                    kind = "identity"
                elif item.asset_type.value == "application":
                    kind = "application"
                elif item.asset_type.value == "database":
                    kind = "database"
                elif item.asset_type.value == "business_service":
                    kind = "service"
                nodes.append({"id": str(item.id), "label": item.name, "kind": kind, "criticality": item.criticality})
        edges = []
        for source, target, relation in zip(nodes, nodes[1:], ["connects_to", "authenticates_to", "depends_on", "accesses"]):
            edges.append({"source": source["id"], "target": target["id"], "relation": relation})
        session.add(
            AttackPath(
                organization_id=org.id,
                name="Internet → payment service",
                risk_score=87,
                financial_exposure=12_500_000,
                nodes=nodes,
                edges=edges,
                critical_weakness="Insufficient MFA coverage on privileged VPN and IdP paths",
                recommended_action="Deploy MFA to privileged accounts and restrict VPN admin roles",
            )
        )

    if not await session.scalar(select(func.count()).select_from(BlockchainEvidence).where(BlockchainEvidence.organization_id == org.id)):
        payload = f"risk-assessment:{org.id}:vpn-path"
        digest = hash_payload(payload)
        session.add(
            BlockchainEvidence(
                organization_id=org.id,
                evidence_type="risk-assessment",
                entity_id=org.id,
                evidence_hash=digest,
                timestamp=datetime.now(UTC),
                blockchain_network="prototype-ledger",
                transaction_hash=simulate_transaction_hash(digest),
                verification_status=VerificationStatus.RECORDED,
                notes="SHA-256 prototype ledger. Not written to a public chain.",
            )
        )


if __name__ == "__main__":
    asyncio.run(seed())
