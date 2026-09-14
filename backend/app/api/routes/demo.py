"""SIH 2026 Judge Demo Controller and Scenario Simulation Engine."""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import delete, or_, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.core.config import settings
from app.models.enums import UserRole
from app.models.telemetry import (
    RiskAlert,
    RiskChangeEvent,
    SecurityEvent,
    ThreatIndicator,
)
from app.models.risk import Risk
from app.models.asset import Asset
from app.models.vulnerability import Vulnerability
from app.models.financial_risk import FinancialRisk
from app.schemas.common import DataResponse
from app.services.audit_service import AuditService
from app.services.blockchain_service import record_evidence
from app.services.financial_engine import calculate_eal

router = APIRouter(prefix="/demo", tags=["demo"])

# In-memory demo simulation state
_demo_state: dict[str, Any] = {
    "active_scene": 1,
    "scene_title": "Normal State",
    "description": "Baseline enterprise state before attack telemetry arrives.",
    "baseline_risk": 72.0,
    "current_risk": 72.0,
    "total_financial_exposure": 48_200_000.0,
    "expected_annual_loss": 4_500_000.0,
    "active_alerts_count": 0,
    "simulated_events_count": 0,
    "last_updated": datetime.now(timezone.utc).isoformat(),
}

SCENE_METADATA: dict[int, dict[str, Any]] = {
    1: {
        "title": "Normal State",
        "description": "Enterprise starts with baseline residual risk 72.0, ₹4.82 Cr exposure, and 3 critical risks.",
        "risk_score": 72.0,
        "current_risk": 72.0,
        "eal": 4_500_000.0,
        "expected_annual_loss": 4_500_000.0,
        "exposure": 48_200_000.0,
        "total_financial_exposure": 48_200_000.0,
    },
    2: {
        "title": "Attack Begins",
        "description": "Synthetic EDR/SIEM telemetry arrives: Brute-force & credential stuffing detected on payment jumpbox.",
        "risk_score": 74.5,
        "current_risk": 74.5,
        "eal": 4_850_000.0,
        "expected_annual_loss": 4_850_000.0,
        "exposure": 51_000_000.0,
        "total_financial_exposure": 51_000_000.0,
    },
    3: {
        "title": "Critical Vulnerability Appears",
        "description": "CVE-2024-3400 (PAN-OS OS Command Injection) discovered. Residual risk spikes to 84.0.",
        "risk_score": 84.0,
        "current_risk": 84.0,
        "eal": 6_350_000.0,
        "expected_annual_loss": 6_350_000.0,
        "exposure": 62_000_000.0,
        "total_financial_exposure": 62_000_000.0,
    },
    4: {
        "title": "Threat Intelligence Matches",
        "description": "IoC matches active APT29 / Lazarus campaign actively exploiting PAN-OS gateway.",
        "risk_score": 86.5,
        "current_risk": 86.5,
        "eal": 6_900_000.0,
        "expected_annual_loss": 6_900_000.0,
        "exposure": 68_500_000.0,
        "total_financial_exposure": 68_500_000.0,
    },
    5: {
        "title": "Attack Path Escalates",
        "description": "Neo4j attack path traversal confirms Internet → VPN → Identity Provider → Payment DB path is now CRITICAL.",
        "risk_score": 88.0,
        "current_risk": 88.0,
        "eal": 7_400_000.0,
        "expected_annual_loss": 7_400_000.0,
        "exposure": 74_000_000.0,
        "total_financial_exposure": 74_000_000.0,
    },
    6: {
        "title": "Financial Engine Recalculates",
        "description": "Financial risk engine calculates +₹18.5 Lakh shift in Expected Annual Loss with ₹7.4 Cr max exposure.",
        "risk_score": 88.0,
        "current_risk": 88.0,
        "eal": 7_400_000.0,
        "expected_annual_loss": 7_400_000.0,
        "exposure": 74_000_000.0,
        "total_financial_exposure": 74_000_000.0,
    },
    7: {
        "title": "Optimizer Prompted (₹50 Lakh)",
        "description": "Executive prompts optimizer with ₹50 Lakh budget constraint and Balanced objective.",
        "risk_score": 88.0,
        "current_risk": 88.0,
        "eal": 7_400_000.0,
        "expected_annual_loss": 7_400_000.0,
        "exposure": 74_000_000.0,
        "total_financial_exposure": 74_000_000.0,
    },
    8: {
        "title": "Optimizer Produces Portfolio",
        "description": "OR-Tools selects 3 controls (Emergency Virtual Patching, EDR Containment, MFA) with 268.97x ROSI.",
        "risk_score": 61.5,
        "current_risk": 61.5,
        "eal": 3_200_000.0,
        "expected_annual_loss": 3_200_000.0,
        "exposure": 32_000_000.0,
        "total_financial_exposure": 32_000_000.0,
    },
    9: {
        "title": "AI Advisor Explains",
        "description": "AI Risk Advisor generates structured explanation: Grounded findings, financial impact, and strategic actions.",
        "risk_score": 61.5,
        "current_risk": 61.5,
        "eal": 3_200_000.0,
        "expected_annual_loss": 3_200_000.0,
        "exposure": 32_000_000.0,
        "total_financial_exposure": 32_000_000.0,
    },
    10: {
        "title": "Blockchain Evidence Notarizes",
        "description": "Continuous risk change notarized to tamper-evident blockchain ledger with SHA-256 verification hash.",
        "risk_score": 61.5,
        "current_risk": 61.5,
        "eal": 3_200_000.0,
        "expected_annual_loss": 3_200_000.0,
        "exposure": 32_000_000.0,
        "total_financial_exposure": 32_000_000.0,
    },
    11: {
        "title": "Executive Report Generated",
        "description": "CISO/Board decision brief compiled with ROSI, top drivers, and mandatory statutory disclaimer.",
        "risk_score": 61.5,
        "current_risk": 61.5,
        "eal": 3_200_000.0,
        "expected_annual_loss": 3_200_000.0,
        "exposure": 32_000_000.0,
        "total_financial_exposure": 32_000_000.0,
    },
}


class DemoStateResponse(BaseModel):
    demo_mode: bool
    active_scene: int
    scene_title: str
    description: str
    baseline_risk: float
    current_risk: float
    total_financial_exposure: float
    expected_annual_loss: float
    active_alerts_count: int
    simulated_events_count: int
    last_updated: str
    scenes: list[dict[str, Any]]


@router.get("/state", response_model=DataResponse[DemoStateResponse])
async def get_demo_state(user: CurrentUser) -> DataResponse[DemoStateResponse]:
    """Retrieve current demo state and scenario progress."""
    scenes_list = [
        {
            "scene_id": sid,
            **meta,
            "expected_annual_loss": meta.get("expected_annual_loss", meta["eal"]),
            "total_financial_exposure": meta.get("total_financial_exposure", meta["exposure"]),
            "current_risk": meta.get("current_risk", meta["risk_score"]),
        }
        for sid, meta in SCENE_METADATA.items()
    ]
    return DataResponse(
        data=DemoStateResponse(
            demo_mode=settings.demo_mode,
            active_scene=_demo_state["active_scene"],
            scene_title=_demo_state["scene_title"],
            description=_demo_state["description"],
            baseline_risk=_demo_state["baseline_risk"],
            current_risk=_demo_state["current_risk"],
            total_financial_exposure=_demo_state["total_financial_exposure"],
            expected_annual_loss=_demo_state["expected_annual_loss"],
            active_alerts_count=_demo_state["active_alerts_count"],
            simulated_events_count=_demo_state["simulated_events_count"],
            last_updated=_demo_state["last_updated"],
            scenes=scenes_list,
        )
    )


@router.post("/reset", response_model=DataResponse[dict[str, Any]])
async def reset_demo(
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict[str, Any]]:
    """One-click demo reset endpoint for SIH judges.

    Cleans up synthetic telemetry, resolves demo alerts, resets risk change events,
    and restores baseline metrics without touching actual organization seed data.
    Requires DEMO_MODE=true and ADMIN or CISO role.
    """
    if not settings.demo_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo reset is only available when DEMO_MODE=true is enabled.",
        )

    require_roles(UserRole.ADMIN, UserRole.CISO)(user)
    org_id = user.organization_id

    # 1. Clean up demo synthetic events
    stmt_events = (
        delete(SecurityEvent)
        .where(
            SecurityEvent.organization_id == org_id,
            (SecurityEvent.is_demo == True) | (SecurityEvent.raw_reference.like("demo:%")),
        )
    )
    await session.execute(stmt_events)

    # 2. Reset or resolve demo alerts
    alerts = list(
        (
            await session.scalars(
                select(RiskAlert).where(RiskAlert.organization_id == org_id)
            )
        ).all()
    )
    for alert in alerts:
        if alert.title.startswith("[DEMO]"):
            await session.delete(alert)
        else:
            alert.status = "RESOLVED"

    # 3. Clean up demo risk change events
    stmt_rc = (
        delete(RiskChangeEvent)
        .where(
            RiskChangeEvent.organization_id == org_id,
            RiskChangeEvent.reason.like("%[DEMO]%"),
        )
    )
    await session.execute(stmt_rc)

    # 4. Restore Risk & FinancialRisk records to baseline
    risks = list((await session.scalars(select(Risk).where(Risk.organization_id == org_id))).all())
    for r in risks:
        if r.residual_risk > 72.0 or float(r.expected_annual_loss) > 4_500_000.0:
            r.residual_risk = 72.0
            r.expected_annual_loss = 4_500_000.0
            r.financial_exposure = 48_200_000.0
            r.drivers = [d for d in (r.drivers or []) if not d.startswith("[DEMO]") and "Credential Stuffing" not in d]

    fin_risks = list((await session.scalars(select(FinancialRisk).where(FinancialRisk.organization_id == org_id))).all())
    for fr in fin_risks:
        if float(fr.expected_loss) > 4_500_000.0:
            fr.expected_loss = 4_500_000.0
            fr.annualized_loss = 4_500_000.0

    await session.commit()

    # 5. Reset in-memory state to Scene 1
    _demo_state["active_scene"] = 1
    _demo_state["scene_title"] = SCENE_METADATA[1]["title"]
    _demo_state["description"] = SCENE_METADATA[1]["description"]
    _demo_state["current_risk"] = SCENE_METADATA[1]["risk_score"]
    _demo_state["expected_annual_loss"] = SCENE_METADATA[1]["eal"]
    _demo_state["total_financial_exposure"] = SCENE_METADATA[1]["exposure"]
    _demo_state["active_alerts_count"] = 0
    _demo_state["simulated_events_count"] = 0
    _demo_state["last_updated"] = datetime.now(timezone.utc).isoformat()

    await AuditService.log_action(
        session=session,
        organization_id=org_id,
        user_id=user.id,
        action="DEMO_RESET",
        entity_type="DEMO",
        entity_id="SCENE_1",
        result="SUCCESS",
        details={"reset_to_scene": 1, "status": "BASELINE_RESTORED"},
    )

    return DataResponse(
        data={
            "status": "RESET_SUCCESSFUL",
            "active_scene": 1,
            "scene_title": "Normal State",
            "message": "Demo state cleanly restored to Scene 1 baseline. Synthetic telemetry and demo alerts purged.",
        }
    )


@router.post("/scene/{scene_id}", response_model=DataResponse[dict[str, Any]])
async def trigger_scene(
    scene_id: int,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict[str, Any]]:
    """Trigger a specific scene in the continuous SIH demo storytelling flow (1 through 11)."""
    if scene_id not in SCENE_METADATA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Scene ID {scene_id} is invalid. Supported scenes: 1 through 11.",
        )

    org_id = user.organization_id
    meta = SCENE_METADATA[scene_id]

    # Update in-memory demo metrics
    _demo_state["active_scene"] = scene_id
    _demo_state["scene_title"] = meta["title"]
    _demo_state["description"] = meta["description"]
    _demo_state["current_risk"] = meta["risk_score"]
    _demo_state["expected_annual_loss"] = meta["eal"]
    _demo_state["total_financial_exposure"] = meta["exposure"]
    _demo_state["last_updated"] = datetime.now(timezone.utc).isoformat()

    # Scene-specific backend actions
    if scene_id == 2:
        # Attack begins: inject synthetic telemetry event
        event = SecurityEvent(
            organization_id=org_id,
            source="SIEM",
            event_type="AUTHENTICATION_FAILURE",
            raw_reference="demo:scene2:brute_force",
            severity="HIGH",
            hostname="jumpbox-corp-01.internal",
            description="[DEMO] High-frequency credential stuffing & MFA bypass attempts detected from external IP (194.26.29.112) targeting payment jumpbox",
            timestamp=datetime.now(timezone.utc),
            processed=True,
            is_demo=True,
        )
        session.add(event)
        _demo_state["simulated_events_count"] += 1

        # Synchronous Risk & Financial Recalculation
        target_asset = (
            await session.scalars(
                select(Asset).where(
                    Asset.organization_id == org_id,
                    or_(
                        Asset.name.ilike("%Payment%"),
                        Asset.name.ilike("%VPN%"),
                        Asset.name.ilike("%Identity%"),
                    ),
                )
            )
        ).first()

        risk_stmt = (
            select(Risk).where(
                Risk.organization_id == org_id,
                Risk.asset_id == target_asset.id,
            )
            if target_asset
            else select(Risk).where(Risk.organization_id == org_id)
        )
        risk_row = (await session.scalars(risk_stmt)).first()

        fin_calc = calculate_eal(
            likelihood=0.75,
            asset_business_value=float(target_asset.business_value if target_asset and target_asset.business_value else 10_000_000.0),
            impact=0.85,
        )

        previous_score = float(risk_row.residual_risk) if risk_row else 72.0
        previous_eal = float(risk_row.expected_annual_loss) if risk_row else 4_500_000.0
        new_score = meta["risk_score"]  # 74.5
        new_eal = meta["eal"]          # 4,850,000.0
        new_exposure = meta["exposure"] # 51,000,000.0

        if risk_row:
            risk_row.likelihood = 0.75
            risk_row.residual_risk = new_score
            risk_row.expected_annual_loss = new_eal
            risk_row.financial_exposure = new_exposure
            risk_row.calculated_at = datetime.now(timezone.utc)
            drivers = list(risk_row.drivers or [])
            if "Credential Stuffing on Payment Jumpbox" not in drivers:
                drivers.insert(0, "Credential Stuffing on Payment Jumpbox")
            risk_row.drivers = drivers

            fin_stmt = select(FinancialRisk).where(
                FinancialRisk.organization_id == org_id,
                FinancialRisk.risk_id == risk_row.id,
            )
            fin_row = (await session.scalars(fin_stmt)).first()
            if fin_row:
                fin_row.expected_loss = new_eal
                fin_row.annualized_loss = new_eal
                fin_row.min_loss = float(fin_calc["probable_minimum_loss"])
                fin_row.max_loss = float(fin_calc["probable_maximum_loss"])
            else:
                fin_row = FinancialRisk(
                    organization_id=org_id,
                    risk_id=risk_row.id,
                    expected_loss=new_eal,
                    annualized_loss=new_eal,
                    min_loss=float(fin_calc["probable_minimum_loss"]),
                    max_loss=float(fin_calc["probable_maximum_loss"]),
                    confidence_level=0.8,
                )
                session.add(fin_row)

        change = RiskChangeEvent(
            organization_id=org_id,
            previous_score=previous_score,
            new_score=new_score,
            score_delta=round(new_score - previous_score, 2),
            previous_eal=previous_eal,
            new_eal=new_eal,
            eal_delta=round(new_eal - previous_eal, 2),
            reason="[DEMO] Attack Begins: High-frequency brute force & credential stuffing detected against jumpbox gateway.",
        )
        session.add(change)

        alert = RiskAlert(
            organization_id=org_id,
            severity="HIGH",
            status="OPEN",
            title="[DEMO] Credential Stuffing Attack on Jumpbox",
            description="High-frequency authentication failures and MFA bypass attempts detected from 194.26.29.112. Risk elevated to 74.5.",
            risk_change=round(new_score - previous_score, 2),
            financial_impact=round(new_eal - previous_eal, 2),
        )
        session.add(alert)
        _demo_state["active_alerts_count"] += 1
        await session.commit()

    elif scene_id == 3:
        # Critical vulnerability appears
        change = RiskChangeEvent(
            organization_id=org_id,
            previous_score=72.0,
            new_score=84.0,
            score_delta=12.0,
            previous_eal=4_500_000.0,
            new_eal=6_350_000.0,
            eal_delta=1_850_000.0,
            reason="[DEMO] Critical weaponized vulnerability discovered: CVE-2024-3400 PAN-OS OS Command Injection",
        )
        session.add(change)

        alert = RiskAlert(
            organization_id=org_id,
            severity="CRITICAL",
            status="OPEN",
            title="[DEMO] Vulnerability Spike: CVE-2024-3400",
            description="Enterprise cyber risk drifted +12.0 points to 84.0 due to unpatched gateway vulnerability.",
            risk_change=12.0,
            financial_impact=1_850_000.0,
        )
        session.add(alert)
        _demo_state["active_alerts_count"] += 1
        await session.commit()

    elif scene_id == 4:
        # Threat intel match
        now = datetime.now(timezone.utc)
        indicator = ThreatIndicator(
            organization_id=org_id,
            indicator="194.26.29.112",
            indicator_type="IP",
            threat_actor="APT29",
            campaign="PAN-OS Exploitation 2024",
            confidence=0.96,
            first_seen=now,
            last_seen=now,
            active=True,
            source="OpenCTI-Feed",
        )
        session.add(indicator)
        await session.commit()

    elif scene_id == 10:
        # Notarize blockchain evidence
        evidence = await record_evidence(
            session=session,
            organization_id=org_id,
            evidence_type="CONTINUOUS_RISK_CHANGE",
            entity_id=uuid4(),
            payload=f"[DEMO] MaterialRiskEscalation: 72.0 -> 84.0 (+12.0), EAL Shift +18.5 Lakh, Notarized for Audit Trail.",
        )
        _demo_state["blockchain_hash"] = evidence.evidence_hash

    await AuditService.log_action(
        session=session,
        organization_id=org_id,
        user_id=user.id,
        action=f"DEMO_SCENE_{scene_id}",
        entity_type="DEMO",
        entity_id=str(scene_id),
        result="SUCCESS",
        details=meta,
    )

    return DataResponse(
        data={
            "scene_id": scene_id,
            "scene_title": meta["title"],
            "description": meta["description"],
            "current_risk": meta.get("current_risk", meta["risk_score"]),
            "expected_annual_loss": meta.get("expected_annual_loss", meta["eal"]),
            "total_financial_exposure": meta.get("total_financial_exposure", meta["exposure"]),
            "message": f"Scene {scene_id}: '{meta['title']}' executed successfully.",
        }
    )
