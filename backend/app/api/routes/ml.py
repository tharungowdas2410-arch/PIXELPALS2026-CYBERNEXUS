from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import DataResponse
from app.schemas.ml import IncidentPredictRequest, RiskForecastRequest
from app.services import ml_risk_service, risk_forecast_service

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/status")
async def ml_status(_user: CurrentUser) -> DataResponse[dict]:
    return DataResponse(data=ml_risk_service.model_status())


@router.post("/predict-incident")
async def predict_incident(
    payload: IncidentPredictRequest,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict]:
    data = await ml_risk_service.predict_incident(
        session,
        user.organization_id,
        payload.asset_id,
        payload.vulnerability_ids,
        payload.threat_ids,
    )
    return DataResponse(data=data, meta={"illustrative": True})


@router.post("/forecast-risk")
async def forecast_risk(
    payload: RiskForecastRequest,
    user: CurrentUser,
    session: DbSession,
) -> DataResponse[dict]:
    data = await risk_forecast_service.forecast_risk_for_org(
        session,
        user.organization_id,
        asset_id=payload.asset_id,
        history=payload.history,
    )
    return DataResponse(data=data, meta={"illustrative": True})


@router.get("/anomalies")
async def anomalies(user: CurrentUser, session: DbSession) -> DataResponse[dict]:
    data = await ml_risk_service.detect_anomalies(session, user.organization_id)
    return DataResponse(data=data, meta={"illustrative": True})


@router.get("/model-performance")
async def model_performance(_user: CurrentUser) -> DataResponse[dict]:
    return DataResponse(data=ml_risk_service.model_performance(), meta={"illustrative": True})


@router.get("/risk-signals")
async def risk_signals(user: CurrentUser, session: DbSession) -> DataResponse[dict]:
    data = await ml_risk_service.risk_signals(session, user.organization_id)
    return DataResponse(data=data, meta={"illustrative": True})
