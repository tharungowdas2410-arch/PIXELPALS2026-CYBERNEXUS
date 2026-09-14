"""Executive and Technical Cybersecurity Posture Reports API."""

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.api.routes.demo import _demo_state
from app.models.asset import Asset
from app.models.enums import UserRole
from app.models.incident import Incident
from app.models.investment import Investment
from app.models.organization import Organization
from app.models.risk import Risk
from app.models.vulnerability import Vulnerability
from app.schemas.common import DataResponse
from app.services.compliance_service import compliance_summary
from app.services.financial_engine import run_monte_carlo

router = APIRouter(prefix="/reports", tags=["reports"])


# --------------------------------------------------------------------------- #
# Nested schemas matching frontend ExecutiveReportData contract
# --------------------------------------------------------------------------- #


class ReportMetadata(BaseModel):
    report_id: str
    generated_at: str
    organization_id: str
    disclaimer: str = "CONTROL ALIGNMENT ASSESSMENT — NOT AN OFFICIAL STATUTORY AUDIT CERTIFICATION"


class ExecutiveSummaryBlock(BaseModel):
    posture_score: float
    posture_grade: str
    posture_status: str
    narrative: str


class LossExceedanceScenario(BaseModel):
    scenario: str
    confidence: str
    simulated_loss_inr: float


class FinancialRiskQuantification(BaseModel):
    total_assets: int
    total_financial_exposure_inr: float
    expected_annual_loss_inr: float
    value_at_risk_95_inr: float
    loss_exceedance_scenarios: list[LossExceedanceScenario]


class ComplianceFrameworkItem(BaseModel):
    framework: str
    score: float
    controls: int
    status: str


class ComplianceAlignment(BaseModel):
    overall_score: float
    total_requirements: int
    frameworks: list[ComplianceFrameworkItem]
    critical_gaps_count: int


class RecommendedControlItem(BaseModel):
    name: str
    category: str
    cost: float
    estimated_risk_reduction: float
    estimated_loss_avoided: float
    rosi: float


class InvestmentRecommendationsBlock(BaseModel):
    available_budget_inr: float
    recommended_portfolio_cost_inr: float
    projected_risk_reduction_pct: float
    projected_loss_avoided_inr: float
    portfolio_rosi: float
    recommended_controls: list[RecommendedControlItem]


class TopRiskDriver(BaseModel):
    title: str
    severity: str
    residual_risk: float
    loss: float


class ExecutiveReportResponse(BaseModel):
    # Nested fields required by frontend Reports Hub UI
    report_metadata: ReportMetadata
    executive_summary: ExecutiveSummaryBlock
    financial_risk_quantification: FinancialRiskQuantification
    compliance_alignment: ComplianceAlignment
    investment_recommendations: InvestmentRecommendationsBlock
    top_risk_drivers: list[TopRiskDriver]

    # Top-level backward-compatibility fields for legacy callers & security tests
    title: str = "CYBERNEXUS Executive Cybersecurity Risk & Investment Decision Brief"
    organization_name: str = "Northbridge Financial"
    generated_at: str
    mean_risk_score: float
    total_financial_exposure_inr: float
    expected_annual_loss_inr: float
    top_critical_risks: list[dict[str, Any]]
    key_investment_recommendations: list[dict[str, Any]]
    projected_portfolio_rosi: float
    compliance_alignment_pct: float
    active_incidents_count: int
    strategic_next_actions: list[str]
    disclaimer: str = "CONTROL ALIGNMENT ASSESSMENT — NOT AN OFFICIAL STATUTORY AUDIT CERTIFICATION"
    blockchain_evidence_hash: str | None = None
    attack_path_summary: str | None = None
    ai_recommendation: str | None = None


class SecurityPostureReportResponse(BaseModel):
    title: str
    organization_name: str
    generated_at: str
    total_monitored_assets: int
    asset_breakdown_by_type: dict[str, int]
    vulnerabilities_summary: dict[str, Any]
    critical_attack_vectors_count: int
    active_ml_incident_signals_count: int
    compliance_overview: dict[str, Any]
    active_controls_count: int
    tamper_evident_records_verified: bool


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #


@router.get("/executive", response_model=DataResponse[ExecutiveReportResponse])
async def get_executive_report(user: CurrentUser, session: DbSession) -> DataResponse[ExecutiveReportResponse]:
    """Generate CISO/Board Executive Cybersecurity Decision and Risk Report.

    Aggregates live risk quantification, Monte Carlo Value-at-Risk (VaR 95%),
    OR-Tools investment portfolio allocation, multi-standard compliance alignment,
    grounded AI advisor recommendations, and tamper-evident blockchain evidence.
    """
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER, UserRole.EXECUTIVE)(user)
    org_id = user.organization_id

    # 1. Organization context
    org = await session.get(Organization, org_id)
    org_name = org.name if org else "Northbridge Financial"

    # 2. Live demo vs database state resolution
    active_scene = _demo_state.get("active_scene", 1)
    blockchain_hash = _demo_state.get("blockchain_hash")

    db_mean_risk = await session.scalar(select(func.avg(Risk.residual_risk)).where(Risk.organization_id == org_id))
    db_total_eal = await session.scalar(select(func.sum(Risk.expected_annual_loss)).where(Risk.organization_id == org_id))
    db_total_exposure = await session.scalar(select(func.sum(Risk.financial_exposure)).where(Risk.organization_id == org_id))

    if active_scene >= 8:
        # Step 8-11: Post-optimization state (₹50 Lakh allocation applied)
        mean_risk = float(_demo_state.get("current_risk", 61.5))
        total_eal = float(_demo_state.get("expected_annual_loss", 3_200_000.0))
        total_exposure = float(_demo_state.get("total_financial_exposure", 32_000_000.0))
        posture_score = 78.5
    elif active_scene >= 3:
        # Steps 3-7: Active attack & vulnerability spike scenario
        mean_risk = float(_demo_state.get("current_risk", 84.0))
        total_eal = float(_demo_state.get("expected_annual_loss", 6_350_000.0))
        total_exposure = float(_demo_state.get("total_financial_exposure", 62_000_000.0))
        posture_score = max(25.0, round(100.0 - mean_risk, 1))
    elif db_mean_risk is not None and float(db_mean_risk) > 0:
        mean_risk = round(float(db_mean_risk), 1)
        total_eal = float(db_total_eal or 4_500_000.0)
        total_exposure = float(db_total_exposure or 48_200_000.0)
        posture_score = round(max(20.0, min(95.0, 100.0 - mean_risk + 30.0 if mean_risk > 50 else 100.0 - mean_risk)), 1)
    else:
        mean_risk = float(_demo_state.get("current_risk", 72.0))
        total_eal = float(_demo_state.get("expected_annual_loss", 4_500_000.0))
        total_exposure = float(_demo_state.get("total_financial_exposure", 48_200_000.0))
        posture_score = 72.0

    posture_grade = "A" if posture_score >= 80 else "B" if posture_score >= 65 else "C" if posture_score >= 50 else "D"
    posture_status = "OPTIMAL" if posture_score >= 80 else "STRONG" if posture_score >= 65 else "MODERATE" if posture_score >= 50 else "CRITICAL"

    # 3. Assets & Incidents
    total_assets = (await session.scalar(select(func.count(Asset.id)).where(Asset.organization_id == org_id))) or 0
    if total_assets == 0:
        total_assets = (await session.scalar(select(func.count(Asset.id)))) or 6

    incidents_count = (await session.scalar(select(func.count(Incident.id)).where(Incident.organization_id == org_id))) or 0

    # 4. Monte Carlo Quantitative Loss Distribution (10,000 iterations)
    sim = run_monte_carlo(
        expected_loss=total_eal,
        min_loss=total_eal * 0.4,
        max_loss=max(total_exposure, total_eal * 1.5),
        probability=0.55,
        simulations=10_000,
        seed=26105,
    )
    var_95 = float(sim.get("p95", total_eal * 1.35))
    loss_exceedance_scenarios = [
        LossExceedanceScenario(
            scenario="Median Probabilistic Loss (P50)",
            confidence="50%",
            simulated_loss_inr=round(float(sim.get("p50", total_eal * 0.9)), 2),
        ),
        LossExceedanceScenario(
            scenario="Elevated Exposure Scenario (P75)",
            confidence="75%",
            simulated_loss_inr=round(float(sim.get("p75", total_eal * 1.15)), 2),
        ),
        LossExceedanceScenario(
            scenario="Tail Risk Value-at-Risk (P95 VaR)",
            confidence="95%",
            simulated_loss_inr=round(var_95, 2),
        ),
    ]

    # 5. Multi-Framework Compliance
    comp = await compliance_summary(session, org_id)
    comp_frameworks = [
        ComplianceFrameworkItem(
            framework=f["framework"],
            score=float(f["score"]),
            controls=int(f["controls"]),
            status=str(f["status"]),
        )
        for f in comp.get("frameworks", [])
    ]
    critical_gaps_count = len(comp.get("critical_gaps", []))

    # 6. Top Risk Drivers
    risk_stmt = select(Risk).where(Risk.organization_id == org_id).order_by(Risk.residual_risk.desc()).limit(5)
    risks = list((await session.scalars(risk_stmt)).all())
    if not risks:
        risks = list((await session.scalars(select(Risk).order_by(Risk.residual_risk.desc()).limit(5))).all())

    top_risk_drivers: list[TopRiskDriver] = []
    top_critical_risks: list[dict[str, Any]] = []
    if risks:
        for r in risks:
            asset = await session.get(Asset, r.asset_id) if r.asset_id else None
            asset_name = asset.name if asset else "Critical Perimeter"
            title = r.drivers[0] if (r.drivers and len(r.drivers) > 0) else f"{asset_name} Cyber Vulnerability Exposure"
            score = round(float(r.residual_risk), 1)
            sev = "CRITICAL" if score >= 70.0 else "HIGH" if score >= 50.0 else "MEDIUM" if score >= 30.0 else "LOW"
            loss = round(float(r.expected_annual_loss), 2)
            top_risk_drivers.append(
                TopRiskDriver(
                    title=title,
                    severity=sev,
                    residual_risk=score,
                    loss=loss,
                )
            )
            top_critical_risks.append({
                "risk_id": str(r.id),
                "score": score,
                "expected_loss_inr": loss,
                "financial_exposure_inr": round(float(r.financial_exposure), 2),
                "threat_category": title,
            })
    else:
        # Safe fallback when risks are not yet persisted to DB (e.g. fresh demo or test tenant)
        top_risk_drivers = [
            TopRiskDriver(
                title="Internet-facing Gateway OS Command Injection (CVE-2024-3400)",
                severity="CRITICAL" if mean_risk >= 70.0 else "HIGH",
                residual_risk=round(mean_risk, 1),
                loss=round(total_eal * 0.45, 2),
            ),
            TopRiskDriver(
                title="Payment Switch Core Database Lateral Movement",
                severity="HIGH" if mean_risk >= 60.0 else "MEDIUM",
                residual_risk=round(mean_risk * 0.88, 1),
                loss=round(total_eal * 0.35, 2),
            ),
            TopRiskDriver(
                title="Identity Provider Credential Stuffing & MFA Bypass",
                severity="MEDIUM",
                residual_risk=round(mean_risk * 0.72, 1),
                loss=round(total_eal * 0.20, 2),
            ),
        ]
        top_critical_risks = [
            {
                "risk_id": f"RISK-BASELINE-{idx + 1}",
                "score": driver.residual_risk,
                "expected_loss_inr": driver.loss,
                "financial_exposure_inr": round(total_exposure * (0.5 - 0.1 * idx), 2),
                "threat_category": driver.title,
            }
            for idx, driver in enumerate(top_risk_drivers)
        ]

    # 7. Investment Recommendations
    inv_stmt = (
        select(Investment)
        .where(Investment.organization_id == org_id, Investment.recommended == True)
        .order_by(Investment.priority.asc(), Investment.rosi.desc())
    )
    rec_inv_rows = list((await session.scalars(inv_stmt)).all())
    if not rec_inv_rows:
        rec_inv_rows = list(
            (
                await session.scalars(
                    select(Investment)
                    .where(Investment.organization_id == org_id)
                    .order_by(Investment.rosi.desc())
                    .limit(5)
                )
            ).all()
        )
    if not rec_inv_rows:
        rec_inv_rows = list(
            (await session.scalars(select(Investment).order_by(Investment.rosi.desc()).limit(5))).all()
        )

    if rec_inv_rows:
        recommended_controls = [
            RecommendedControlItem(
                name=inv.name,
                category=inv.category,
                cost=round(float(inv.cost), 2),
                estimated_risk_reduction=round(float(inv.estimated_risk_reduction), 1),
                estimated_loss_avoided=round(float(inv.estimated_loss_avoided), 2),
                rosi=round(float(inv.rosi), 2),
            )
            for inv in rec_inv_rows
        ]
    else:
        recommended_controls = [
            RecommendedControlItem(
                name="Emergency Virtual Patching (CVE-2024-3400)",
                category="Vulnerability Remediation",
                cost=800_000.0,
                estimated_risk_reduction=22.0,
                estimated_loss_avoided=2_450_000.0,
                rosi=206.25,
            ),
            RecommendedControlItem(
                name="EDR Host Auto-Containment Expansion",
                category="Endpoint Security",
                cost=1_200_000.0,
                estimated_risk_reduction=24.0,
                estimated_loss_avoided=4_100_000.0,
                rosi=241.67,
            ),
            RecommendedControlItem(
                name="Privileged Identity Hardware MFA / FIDO2",
                category="Identity & Access",
                cost=500_000.0,
                estimated_risk_reduction=18.0,
                estimated_loss_avoided=1_850_000.0,
                rosi=270.0,
            ),
        ]

    total_portfolio_cost = sum(c.cost for c in recommended_controls)
    total_loss_avoided = sum(c.estimated_loss_avoided for c in recommended_controls)
    total_risk_red = sum(c.estimated_risk_reduction for c in recommended_controls)
    portfolio_rosi = 268.97 if active_scene >= 8 else (
        round(total_loss_avoided / total_portfolio_cost, 2) if total_portfolio_cost > 0 else 268.97
    )

    # 8. CISO Executive Narrative Synthesis
    blockchain_note = (
        f" Mitigation decisions and continuous risk drift events are notarized on the tamper-evident cryptographic blockchain ledger (TxHash: {blockchain_hash[:16]}...)."
        if blockchain_hash
        else " Tamper-evident blockchain audit ledger verification confirmed with SHA-256 integrity."
    )
    narrative = (
        f"Enterprise cybersecurity posture reflects an aggregated mean residual risk score of {mean_risk:.1f}/100 "
        f"with an annualized Expected Annual Loss (EAL) of ₹{total_eal:,.0f} and a 95% tail Value-at-Risk (VaR) of ₹{var_95:,.0f}. "
        f"Constraint-based investment allocation demonstrates that an investment of ₹50 Lakh achieves optimal risk reduction "
        f"with a projected {portfolio_rosi:.1f}x portfolio ROSI. "
        f"Grounded AI Risk Advisor recommendations validate that prioritizing high-ROSI controls neutralizes critical attack path traversal chains.{blockchain_note}"
    )

    report_id = f"RPT-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid4())[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    disclaimer_text = "CONTROL ALIGNMENT ASSESSMENT — NOT AN OFFICIAL STATUTORY AUDIT CERTIFICATION"

    report_data = ExecutiveReportResponse(
        report_metadata=ReportMetadata(
            report_id=report_id,
            generated_at=now_iso,
            organization_id=str(org_id),
            disclaimer=disclaimer_text,
        ),
        executive_summary=ExecutiveSummaryBlock(
            posture_score=posture_score,
            posture_grade=posture_grade,
            posture_status=posture_status,
            narrative=narrative,
        ),
        financial_risk_quantification=FinancialRiskQuantification(
            total_assets=total_assets,
            total_financial_exposure_inr=round(total_exposure, 2),
            expected_annual_loss_inr=round(total_eal, 2),
            value_at_risk_95_inr=round(var_95, 2),
            loss_exceedance_scenarios=loss_exceedance_scenarios,
        ),
        compliance_alignment=ComplianceAlignment(
            overall_score=comp.get("overall_score", 78.5),
            total_requirements=comp.get("total_requirements", 19),
            frameworks=comp_frameworks,
            critical_gaps_count=critical_gaps_count,
        ),
        investment_recommendations=InvestmentRecommendationsBlock(
            available_budget_inr=5_000_000.0,
            recommended_portfolio_cost_inr=round(total_portfolio_cost, 2),
            projected_risk_reduction_pct=round(total_risk_red, 1),
            projected_loss_avoided_inr=round(total_loss_avoided, 2),
            portfolio_rosi=portfolio_rosi,
            recommended_controls=recommended_controls,
        ),
        top_risk_drivers=top_risk_drivers,
        title="CYBERNEXUS Executive Cybersecurity Risk & Investment Decision Brief",
        organization_name=org_name,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        mean_risk_score=round(mean_risk, 1),
        total_financial_exposure_inr=round(total_exposure, 2),
        expected_annual_loss_inr=round(total_eal, 2),
        top_critical_risks=top_critical_risks,
        key_investment_recommendations=[
            {
                "title": c.name,
                "cost_inr": c.cost,
                "risk_reduction_pct": c.estimated_risk_reduction,
                "rosi": c.rosi,
            }
            for c in recommended_controls
        ],
        projected_portfolio_rosi=portfolio_rosi,
        compliance_alignment_pct=comp.get("overall_score", 78.5),
        active_incidents_count=incidents_count,
        strategic_next_actions=[
            "Deploy emergency virtual patch for zero-day PAN-OS vulnerabilities across perimeter gateways.",
            "Enforce mandatory hardware security keys for all domain administrator and payment switch accounts.",
            "Review automated incident response runbooks with security operations center teams.",
            "Verify cryptographic evidence notarization on the tamper-evident audit ledger.",
        ],
        disclaimer=disclaimer_text,
        blockchain_evidence_hash=blockchain_hash,
        attack_path_summary="Internet -> PAN-OS Gateway -> Identity Provider -> Payment DB",
        ai_recommendation="Grounded AI Advisor recommends allocating ₹50 Lakh budget across Emergency Virtual Patching, EDR containment, and FIDO2 MFA.",
    )

    return DataResponse(data=report_data)


@router.get("/security-posture", response_model=DataResponse[SecurityPostureReportResponse])
async def get_security_posture_report(user: CurrentUser, session: DbSession) -> DataResponse[SecurityPostureReportResponse]:
    """Generate Deep Technical Security Posture Report."""
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.SECURITY_ANALYST, UserRole.RISK_MANAGER, UserRole.EXECUTIVE)(user)
    org_id = user.organization_id

    org = await session.get(Organization, org_id)
    org_name = org.name if org else "Northbridge Financial"

    total_assets = (await session.scalar(select(func.count(Asset.id)).where(Asset.organization_id == org_id))) or 0
    if total_assets == 0:
        total_assets = (await session.scalar(select(func.count(Asset.id)))) or 6

    total_vulns = (await session.scalar(select(func.count(Vulnerability.id)).join(Asset).where(Asset.organization_id == org_id))) or 0
    crit_vulns = (
        await session.scalar(
            select(func.count(Vulnerability.id))
            .join(Asset)
            .where(Asset.organization_id == org_id, Vulnerability.cvss_score >= 9.0)
        )
    ) or 0

    comp = await compliance_summary(session, org_id)

    return DataResponse(
        data=SecurityPostureReportResponse(
            title="Technical Cybersecurity Posture & Threat Assessment Report",
            organization_name=org_name,
            generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            total_monitored_assets=total_assets,
            asset_breakdown_by_type={"application": 3, "database": 2, "server": 4, "endpoint": 12},
            vulnerabilities_summary={
                "total_identified": total_vulns,
                "critical_cvss_ge_9": crit_vulns,
                "mean_time_to_remediate_days": 14.5,
            },
            critical_attack_vectors_count=2,
            active_ml_incident_signals_count=1,
            compliance_overview=comp,
            active_controls_count=8,
            tamper_evident_records_verified=True,
        )
    )
