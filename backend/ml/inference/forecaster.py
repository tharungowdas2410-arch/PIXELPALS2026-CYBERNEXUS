from __future__ import annotations

from datetime import UTC, datetime

from ml.features.feature_engineering import FEATURE_VERSION
from ml.models.risk_forecasting import forecast_risk

MODEL_NAME = "risk_forecasting"
MODEL_VERSION = "v1.0"


def forecast(history: list[float]) -> dict:
    result = forecast_risk(history)
    result.update(
        {
            "model_name": MODEL_NAME,
            "model": "linear_trend_blend",
            "model_version": MODEL_VERSION,
            "feature_version": FEATURE_VERSION,
            "prediction_timestamp": datetime.now(UTC).isoformat(),
        }
    )
    return result
