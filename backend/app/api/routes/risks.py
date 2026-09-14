from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.enums import RiskStatus, UserRole
from app.models.risk import Risk
from app.schemas.common import DataResponse, PaginatedResponse
from app.schemas.risk import (
    RiskCalculateRequest,
    RiskCalculateResponse,
    RiskChainRead,
    RiskDetailRead,
    RiskFactorRead,
    RiskRead,
)
from app.services.financial_engine import calculate_eal
from app.services.query import (
    get_asset_for_org,
    get_control_for_org,
    get_risk_for_org,
    get_threat_or_404,
    get_vulnerability_for_org,
    paginate,
)
from app.services.risk_engine import DEFAULT_EXPLOITABILITY, factor_dicts, quantify_risk, summarize_risks
from app.utils.calculations import FORMULAS, risk_level

router = APIRouter(prefix="/risks", tags=["risks"])


def _chain_payload(
    *,
    organization_id: UUID,
    asset,
    vulnerability,
    threat,
    control,
) -> RiskChainRead:
    return RiskChainRead(
        organization_id=organization_id,
        asset={
            "id": str(asset.id),
            "name": asset.name,
            "criticality": asset.criticality,
            "exposure": asset.exposure,
            "business_value": float(asset.business_value),
            "data_sensitivity": asset.data_sensitivity,
        }
        if asset
        else None,
        vulnerability={
            "id": str(vulnerability.id),
            "title": vulnerability.title,
            "exploitability": vulnerability.exploitability,
            "severity": vulnerability.severity.value,
        }
        if vulnerability
        else None,
        threat={
            "id": str(threat.id),
            "name": threat.name,
            "likelihood": threat.likelihood,
            "sophistication": threat.sophistication,
        }
        if threat
        else None,
        control={
            "id": str(control.id),
            "name": control.name,
            "effectiveness": control.effectiveness,
            "implementation_status": control.implementation_status.value,
        }
        if control
        else None,
    )


@router.get("", response_model=PaginatedResponse[RiskRead])
async def list_risks(
    user: CurrentUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: RiskStatus | None = Query(default=None, alias="status"),
) -> PaginatedResponse[RiskRead]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.RISK_MANAGER,
        UserRole.EXECUTIVE,
        UserRole.SECURITY_ANALYST,
    )(user)
    query = select(Risk).where(Risk.organization_id == user.organization_id).order_by(Risk.residual_risk.desc())
    if status_filter is not None:
        query = query.where(Risk.status == status_filter)
    rows, total = await paginate(session, query, page, page_size)
    return PaginatedResponse(data=[RiskRead.model_validate(row) for row in rows], total=total, page=page, page_size=page_size)


@router.get("/summary")
async def risk_summary(user: CurrentUser, session: DbSession) -> DataResponse[dict]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.RISK_MANAGER,
        UserRole.EXECUTIVE,
        UserRole.SECURITY_ANALYST,
    )(user)
    rows = list(await session.scalars(select(Risk).where(Risk.organization_id == user.organization_id)))
    return DataResponse(data=summarize_risks(rows), meta={"illustrative": True})


@router.post("/calculate")
async def calculate_risk(
    payload: RiskCalculateRequest,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[RiskCalculateResponse]:
    require_roles(UserRole.ADMIN, UserRole.CISO, UserRole.RISK_MANAGER)(user)
    asset = await get_asset_for_org(session, user.organization_id, payload.asset_id)
    exploitability = DEFAULT_EXPLOITABILITY
    vulnerability = None
    if payload.vulnerability_id:
        vulnerability = await get_vulnerability_for_org(session, user.organization_id, payload.vulnerability_id)
        if vulnerability.asset_id != asset.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Vulnerability is not linked to the given asset")
        exploitability = vulnerability.exploitability
    threat = None
    if payload.threat_id:
        threat = await get_threat_or_404(session, payload.threat_id)
    control = None
    effectiveness = 0.0
    implementation_status = None
    if payload.control_id:
        control = await get_control_for_org(session, user.organization_id, payload.control_id)
        effectiveness = control.effectiveness
        implementation_status = control.implementation_status.value
    result = quantify_risk(
        likelihood=payload.likelihood,
        impact=payload.impact,
        criticality=asset.criticality,
        exploitability=exploitability,
        control_effectiveness=effectiveness,
        exposure=asset.exposure,
        threat_likelihood=threat.likelihood if threat else None,
        threat_sophistication=threat.sophistication if threat else None,
        implementation_status=implementation_status,
        vulnerability_severity=vulnerability.severity.value if vulnerability else None,
        data_sensitivity=asset.data_sensitivity,
    )
    finance = calculate_eal(
        likelihood=payload.likelihood,
        asset_business_value=float(asset.business_value),
        impact=payload.impact,
    )
    eal = float(finance["estimated_annual_loss"])
    factors = factor_dicts(result)
    chain = _chain_payload(
        organization_id=user.organization_id,
        asset=asset,
        vulnerability=vulnerability,
        threat=threat,
        control=control,
    )
    row = Risk(
        organization_id=user.organization_id,
        asset_id=asset.id,
        vulnerability_id=payload.vulnerability_id,
        threat_id=payload.threat_id,
        control_id=payload.control_id,
        likelihood=payload.likelihood,
        impact=payload.impact,
        risk_score=result.inherent_risk,
        residual_risk=result.residual_risk,
        financial_exposure=float(finance["probable_maximum_loss"]),
        expected_annual_loss=eal,
        status=RiskStatus.OPEN,
        calculated_at=datetime.now(UTC),
        explanation=result.explanation,
        drivers=result.drivers,
        factors=factors,
        formula_trace=result.formula_trace,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return DataResponse(
        data=RiskCalculateResponse(
            risk_score=result.residual_risk,
            residual_risk=result.residual_risk,
            inherent_risk=result.inherent_risk,
            risk_level=result.risk_level,
            drivers=result.drivers,
            contributing_factors=result.drivers,
            factors=[RiskFactorRead.model_validate(item) for item in factors],
            formula_trace=result.formula_trace,
            applied_control_effectiveness=result.applied_control_effectiveness,
            formulas=result.formulas,
            explanation=result.explanation,
            expected_annual_loss=eal,
            financial_exposure=float(row.financial_exposure),
            chain=chain,
            persisted=RiskRead.model_validate(row),
        )
    )


@router.get("/{risk_id}")
async def get_risk(risk_id: UUID, user: CurrentUser, session: DbSession) -> DataResponse[RiskDetailRead]:
    require_roles(
        UserRole.ADMIN,
        UserRole.CISO,
        UserRole.RISK_MANAGER,
        UserRole.EXECUTIVE,
        UserRole.SECURITY_ANALYST,
    )(user)
    risk = await get_risk_for_org(session, user.organization_id, risk_id)
    asset = await get_asset_for_org(session, user.organization_id, risk.asset_id) if risk.asset_id else None
    vulnerability = (
        await get_vulnerability_for_org(session, user.organization_id, risk.vulnerability_id)
        if risk.vulnerability_id
        else None
    )
    threat = await get_threat_or_404(session, risk.threat_id) if risk.threat_id else None
    control = await get_control_for_org(session, user.organization_id, risk.control_id) if risk.control_id else None
    detail = RiskDetailRead.model_validate(risk).model_copy(
        update={
            "chain": _chain_payload(
                organization_id=user.organization_id,
                asset=asset,
                vulnerability=vulnerability,
                threat=threat,
                control=control,
            ),
            "formulas": dict(FORMULAS),
        }
    )
    return DataResponse(
        data=detail,
        meta={"risk_level": risk_level(risk.residual_risk).value, "illustrative": True},
    )
