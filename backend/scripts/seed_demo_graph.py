"""Demo graph seed.

Generates the canonical enterprise chain for SIH demos:

  Internet -> VPN -> Identity Provider -> App Server -> Customer DB -> Payment Service
                                                   \
                                                    -> Backup Server (depends on DB + Payment)

Also inserts 3 vulnerabilities (CVE-like: auth bypass on VPN, SQL injection on App,
privilege escalation on DB) and a couple of illustrative threats and controls, all
associated to their assets by Postgres UUID, so graph_sync will be able to sync and
the attack path engine can score them.

The script is idempotent — re-running it upserts the same records by name.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.asset import Asset  # noqa: E402
from app.models.control import Control  # noqa: E402
from app.models.enums import AssetType, ImplementationStatus, RemediationStatus, Severity  # noqa: E402
from app.models.organization import Organization  # noqa: E402
from app.models.threat import Threat  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.vulnerability import Vulnerability  # noqa: E402


NAMES = [
    # (name, AssetType, criticality, exposure, env, business_value)
    ("Internet Gateway VPN", AssetType.NETWORK_DEVICE, 5, "internet", "cloud-prod", 5000000),
    ("Identity Provider (SSO)", AssetType.IDENTITY, 5, "internal", "cloud-prod", 4000000),
    ("Customer Application Server", AssetType.APPLICATION, 4, "external", "cloud-prod", 8000000),
    ("Customer Database", AssetType.DATABASE, 5, "internal", "cloud-prod", 22000000),
    ("Payment Service", AssetType.BUSINESS_SERVICE, 5, "partner", "cloud-prod", 60000000),
    ("Backup Server", AssetType.SERVER, 4, "internal", "on-prem", 15000000),
]


VULNS = [
    # (asset index, title, cvss, exploitability, severity, cve_id)
    (0, "CVE-2025-1000 VPN Auth Bypass", 9.8, 0.95, Severity.CRITICAL, "CVE-2025-1000"),
    (2, "CVE-2025-2000 App Server SQL Injection", 8.9, 0.9, Severity.HIGH, "CVE-2025-2000"),
    (3, "CVE-2025-3000 DB Privilege Escalation", 7.5, 0.8, Severity.HIGH, "CVE-2025-3000"),
]

THREATS = [
    ("Ransomware Gangs", "ransomware", 0.75, 0.8),
    ("Insider Threats", "insider", 0.45, 0.55),
    ("APT Financially Motivated", "apt", 0.6, 0.9),
]

CONTROLS = [
    ("Multi-Factor Authentication", "NIST", "identity", 0.7, 240000),
    ("Web Application Firewall", "NIST", "network", 0.65, 120000),
    ("Database Activity Monitoring", "NIST", "data", 0.55, 90000),
    ("Backup Encryption + Air Gap", "NIST", "backup", 0.8, 60000),
]


async def main() -> None:
    from app.core.config import get_settings
    settings = get_settings()
    org_name = "NorthBridge Finance"
    async with SessionLocal() as session:
        from sqlalchemy import select
        existing_org = (await session.scalars(select(Organization).where(Organization.name == org_name))).first()
        if existing_org is None:
            org = Organization(name=org_name, industry="Financial Services", country="IN", security_budget=1_250_000)
            session.add(org)
            await session.flush()
        else:
            org = existing_org
        existing_admin = (await session.scalars(select(User).where(User.email == settings.seed_admin_email))).first()
        if existing_admin is None:
            admin = User(
                email=settings.seed_admin_email,
                password_hash=hash_password(settings.seed_admin_password),
                organization_id=org.id,
                role="admin",
                is_active=True,
                full_name="CISO NorthBridge",
            )
            session.add(admin)
        asset_by_idx = {}
        for idx, (name, kind, crit, exposure, env, bv) in enumerate(NAMES):
            row = (await session.scalars(select(Asset).where(Asset.name == name, Asset.organization_id == org.id))).first()
            if row is None:
                row = Asset(
                    name=name,
                    asset_type=kind,
                    organization_id=org.id,
                    criticality=crit,
                    business_value=bv,
                    exposure=exposure,
                    environment=env,
                    description=f"Demo asset for SIH attack-path chain. Kind={kind.value}.",
                )
                session.add(row)
                await session.flush()
            asset_by_idx[idx] = row

        for idx, title, cvss, exploit, sev, cve in VULNS:
            asset = asset_by_idx[idx]
            existing = (await session.scalars(select(Vulnerability).where(Vulnerability.asset_id == asset.id, Vulnerability.title == title))).first()
            if existing is None:
                session.add(
                    Vulnerability(
                        asset_id=asset.id,
                        title=title,
                        cve_id=cve,
                        cvss_score=cvss,
                        exploitability=exploit,
                        severity=sev,
                        remediation_status=RemediationStatus.OPEN,
                    )
                )

        for name, cat, lhs, soph in THREATS:
            existing = (await session.scalars(select(Threat).where(Threat.name == name))).first()
            if existing is None:
                session.add(Threat(name=name, category=cat, likelihood=lhs, sophistication=soph, active=True))

        for name, fw, cat, eff, cost in CONTROLS:
            existing = (await session.scalars(
                select(Control).where(Control.organization_id == org.id, Control.name == name)
            )).first()
            if existing is None:
                session.add(
                    Control(
                        organization_id=org.id,
                        name=name,
                        framework=fw,
                        category=cat,
                        effectiveness=eff,
                        annual_cost=cost,
                        implementation_status=ImplementationStatus.IMPLEMENTED,
                    )
                )

        await session.commit()
    print(f"[seed] Organization: {org.name} ({org.id})")
    for idx, asset in asset_by_idx.items():
        print(f"[seed] Asset #{idx}: {asset.name} (id={asset.id})")
    print("[seed] Vulnerabilities / threats / controls upserted.")
    print("[seed] Next: POST /api/v1/graph/sync (authenticated) to mirror into Neo4j.")


if __name__ == "__main__":
    asyncio.run(main())
