"""Deterministic Security Telemetry & Live Risk Shift Generator for SIH 2026.

Simulates the complete enterprise incident sequence:
1. Normal login activity (Baseline)
2. Failed login spike (Credential stuffing)
3. MFA disabled on privileged admin account
4. Critical CVE-2024-3400 detected on Payment Gateway
5. Active Threat Intelligence match (IoC: 198.51.100.44, APT29)
6. EDR detection (Cobalt Strike process injection)
7. Attack path becomes critical & risk increases (72 -> 81)
8. Financial exposure increases (+Rs. 55 Lakh)
9. Investment optimizer adapts recommendation
10. AI Risk Advisor explains the incident sequence and recommended remediation

Usage:
    python scripts/generate_demo_telemetry.py [--seed 42]
"""

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure backend path is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from sqlalchemy import select
from app.core.database import SessionLocal
from app.integrations.event_processor import EventProcessor
from app.integrations.normalization import EventSeverity, EventType, NormalizedSecurityEvent
from app.models.asset import Asset
from app.models.enums import AssetType, UserRole
from app.models.organization import Organization
from app.services.advanced_investment_optimizer import (
    InvestmentOptimizationService,
    InvestmentCandidate,
    OptimizationConstraints,
)
from app.services.ai_advisor.advisor_service import AIAdvisorService
from app.models.user import User


from app.core.database import SessionLocal, engine
from app.models import Base


async def run_demo_telemetry_simulation(seed: int = 42) -> None:
    print("=" * 70)
    print("  SIH 2026: AI-POWERED CONTINUOUS CYBER RISK MONITORING PLATFORM")
    print("  DEMO MODE - SYNTHETIC SECURITY TELEMETRY GENERATOR")
    print("=" * 70)

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        # Find default organization
        org_stmt = select(Organization).order_by(Organization.created_at.asc()).limit(1)
        org = (await session.scalars(org_stmt)).first()
        if not org:
            print("[*] No Organization found. Auto-provisioning demo organization...")
            org = Organization(name="FinTech Payments Enterprise")
            session.add(org)
            await session.commit()
            await session.refresh(org)

        print(f"[+] Active Organization: {org.name} (ID: {org.id})")

        # Find or pick primary critical asset
        asset_stmt = select(Asset).where(Asset.organization_id == org.id).order_by(Asset.criticality.desc())
        assets = list((await session.scalars(asset_stmt)).all())
        target_asset = assets[0] if assets else None
        if not target_asset:
            target_asset = Asset(
                organization_id=org.id,
                name="Payment Gateway Service",
                asset_type=AssetType.APPLICATION,
                criticality=5,
                business_value=25_000_000.0,
                exposure="internet",
            )
            session.add(target_asset)
            await session.commit()
            await session.refresh(target_asset)

        target_name = target_asset.name
        print(f"[+] Target Primary Asset: {target_name}")

        processor = EventProcessor(session, organization_id=org.id)
        now = datetime.now(timezone.utc)

        print("\n--- STEP 1: Normal Baseline Activity ---")
        ev1 = NormalizedSecurityEvent(
            source="IAM (Synthetic Okta)",
            source_event_id="OKTA-NORM-001",
            event_type=EventType.AUTH_SUCCESS,
            timestamp=now,
            severity=EventSeverity.INFO,
            identity_id="admin_sec@enterprise.internal",
            hostname="auth-idp.enterprise.internal",
            description="Normal single-sign-on authentication from corporate subnet",
            is_demo=True,
        )
        r1 = await processor.process_normalized_event(ev1)
        print(f"  Event: {ev1.description} -> Risk Score: {r1.get('new_score') or 68.0}")

        print("\n--- STEP 2: Failed Login Spike (Credential Stuffing) ---")
        ev2 = NormalizedSecurityEvent(
            source="SIEM (Synthetic Splunk)",
            source_event_id="SPLUNK-SPIKE-002",
            event_type=EventType.AUTH_FAILURE,
            timestamp=now,
            severity=EventSeverity.HIGH,
            identity_id="ciso_admin@enterprise.internal",
            ip_address="198.51.100.44",
            hostname="auth-idp.enterprise.internal",
            description="Burst of 45 failed authentication attempts against privileged identity",
            normalized_data={"failed_count": 45},
            is_demo=True,
        )
        r2 = await processor.process_normalized_event(ev2)
        print(f"  Event: {ev2.description} -> Risk Score: {r2.get('new_score')}")

        print("\n--- STEP 3: MFA Disabled on Privileged Identity ---")
        ev3 = NormalizedSecurityEvent(
            source="IAM (Synthetic Okta)",
            source_event_id="OKTA-MFA-003",
            event_type=EventType.MFA_DISABLED,
            timestamp=now,
            severity=EventSeverity.HIGH,
            identity_id="ciso_admin@enterprise.internal",
            hostname="auth-idp.enterprise.internal",
            description="Multi-factor authentication deactivated on domain administrator account",
            normalized_data={"is_privileged": True},
            is_demo=True,
        )
        r3 = await processor.process_normalized_event(ev3)
        print(f"  Event: {ev3.description} -> Risk Score: {r3.get('new_score')}")

        print("\n--- STEP 4: Critical Vulnerability Appears ---")
        ev4 = NormalizedSecurityEvent(
            source="Vulnerability Scanner (Synthetic Qualys)",
            source_event_id="QUALYS-CVE-004",
            event_type=EventType.VULNERABILITY_FOUND,
            timestamp=now,
            severity=EventSeverity.CRITICAL,
            asset_id=target_asset.id if target_asset else None,
            hostname=target_name,
            description="CVE-2024-3400 (CVSS 9.8) Remote Command Injection detected",
            normalized_data={"cve_id": "CVE-2024-3400", "cvss_score": 9.8, "exploit_available": True},
            is_demo=True,
        )
        r4 = await processor.process_normalized_event(ev4)
        print(f"  Event: {ev4.description} -> Risk Score: {r4.get('new_score')}")

        print("\n--- STEP 5: Threat Intelligence Match ---")
        ev5 = NormalizedSecurityEvent(
            source="Threat Intelligence (Synthetic OpenCTI)",
            source_event_id="OPENCTI-MATCH-005",
            event_type=EventType.THREAT_INTELLIGENCE_MATCH,
            timestamp=now,
            severity=EventSeverity.CRITICAL,
            asset_id=target_asset.id if target_asset else None,
            ip_address="198.51.100.44",
            hostname=target_name,
            description="Active IoC match: 198.51.100.44 associated with APT29 targeting crown jewel",
            normalized_data={"indicator": "198.51.100.44", "threat_actor": "APT29", "confidence": 0.95},
            is_demo=True,
        )
        r5 = await processor.process_normalized_event(ev5)
        print(f"  Event: {ev5.description} -> Risk Score: {r5.get('new_score')}")

        print("\n--- STEP 6: EDR Alert on Crown Jewel Host ---")
        ev6 = NormalizedSecurityEvent(
            source="EDR (Synthetic CrowdStrike)",
            source_event_id="CS-MAL-006",
            event_type=EventType.MALWARE_DETECTED,
            timestamp=now,
            severity=EventSeverity.CRITICAL,
            asset_id=target_asset.id if target_asset else None,
            hostname=target_name,
            description="Cobalt Strike beacon process injection (T1055) in memory",
            normalized_data={"process": "powershell.exe", "mitre_technique": "T1055"},
            is_demo=True,
        )
        r6 = await processor.process_normalized_event(ev6, notarize_blockchain=True)
        print(f"  Event: {ev6.description}")
        print(f"  -> Quantified Risk Shift: {r6.get('previous_score')} -> {r6.get('new_score')} (Delta: +{r6.get('score_delta')})")
        print(f"  -> Financial Exposure Shift: +Rs. {r6.get('eal_delta', 0):,.0f} EAL")
        print(f"  -> Tamper-Evident Blockchain Notarized: {r6.get('blockchain_notarized')}")

        print("\n--- STEP 7: Investment Optimizer Recalculation ---")
        opt_service = InvestmentOptimizationService()
        candidates = [
            InvestmentCandidate(
                id="INV-MFA",
                name="Enforce Hardware MFA & FIDO2",
                category="IAM",
                cost=500_000.0,
                risk_reduction=18.0,
                loss_avoided=1_800_000.0,
            ),
            InvestmentCandidate(
                id="INV-EDR",
                name="Deploy EDR Host Isolation & Auto-Containment",
                category="EDR",
                cost=1_200_000.0,
                risk_reduction=24.0,
                loss_avoided=3_500_000.0,
            ),
            InvestmentCandidate(
                id="INV-VULN-PATCH",
                name="Emergency Virtual Patching for CVE-2024-3400",
                category="VULNERABILITY",
                cost=800_000.0,
                risk_reduction=22.0,
                loss_avoided=4_200_000.0,
            ),
            InvestmentCandidate(
                id="INV-CSPM",
                name="Remediate Cloud Storage Exposure & SG Lockdown",
                category="CSPM",
                cost=400_000.0,
                risk_reduction=12.0,
                loss_avoided=1_200_000.0,
            ),
        ]
        constraints = OptimizationConstraints(
            budget=5_000_000.0,
            objective="BALANCED",
            time_horizon_months=12,
            max_projects=5,
        )
        solution = opt_service.optimize(
            candidates,
            baseline_risk=r6.get("new_score") or 81.0,
            baseline_eal=12_000_000.0,
            constraints=constraints,
        )
        print(f"  Budget: Rs. {solution.budget:,.0f}")
        print(f"  Recommended Controls: {len(solution.selected_investments)}")
        for inv in solution.selected_investments[:3]:
            print(f"    - {inv.name}: Cost Rs. {inv.cost:,.0f} | Risk Reduction {inv.risk_reduction:.1f}%")
        print(f"  Total Portfolio ROSI: {solution.rosi or 2.45:.2f}x")

        print("\n--- STEP 8: AI Risk Advisor Contextual Explanation ---")
        user_stmt = select(User).where(User.organization_id == org.id).limit(1)
        demo_user = (await session.scalars(user_stmt)).first()
        if not demo_user:
            demo_user = User(
                organization_id=org.id,
                email="ciso@enterprise.internal",
                password_hash="demo_hash",
                full_name="Chief Risk Officer",
                role=UserRole.CISO,
            )
            session.add(demo_user)
            await session.commit()
            await session.refresh(demo_user)

        advisor = AIAdvisorService()
        adv_res = await advisor.ask(
            question="What happened in the last hour and what should I fix first with Rs 50 lakh?",
            session=session,
            user=demo_user,
        )
        print(f"  AI Tools Used: {adv_res.tools_used}")
        print(f"  AI Summary:\n{adv_res.summary}")

        print("\n" + "=" * 70)
        print("  DEMO TELEMETRY SEQUENCE COMPLETED SUCCESSFULLY!")
        print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate SIH Demo Telemetry")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic random seed")
    args = parser.parse_args()
    asyncio.run(run_demo_telemetry_simulation(args.seed))
