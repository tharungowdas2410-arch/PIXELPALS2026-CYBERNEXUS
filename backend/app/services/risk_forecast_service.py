"""Forecast residual risk from stored history. Does not invent missing series."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.risk import Risk
from app.services.ml_risk_service import persist_prediction
from ml.inference.forecaster import forecast as run_forecast
from ml.models.risk_forecasting import MIN_HISTORY


async def residual_history(
    session: AsyncSession,
    organization_id: UUID,
    asset_id: UUID | None = None,
) -> list[float]:
    query = select(Risk).where(Risk.organization_id == organization_id).order_by(Risk.calculated_at.asc())
    if asset_id is not None:
        query = query.where(Risk.asset_id == asset_id)
    risks = list(await session.scalars(query))
    return [float(item.residual_risk) for item in risks]


async def forecast_risk_for_org(
    session: AsyncSession,
    organization_id: UUID,
    *,
    asset_id: UUID | None = None,
    history: list[float] | None = None,
) -> dict:
    series = history if history is not None else await residual_history(session, organization_id, asset_id)
    result = run_forecast(series)
    result["available_points"] = len(series)
    result["required_points"] = MIN_HISTORY
    result["illustrative"] = True
    if result.get("status") == "ok":
        await persist_prediction(
            session,
            organization_id=organization_id,
            asset_id=asset_id,
            prediction_type="risk_forecast",
            value=float(result["forecast"]["30_days"]),
            result=result,
        )
    return result
