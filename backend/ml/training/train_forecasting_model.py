"""Evaluate forecasting helpers against a synthetic but labelled series."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from sklearn.metrics import mean_absolute_error

ROOT = Path(__file__).resolve().parents[1]
BACKEND = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND))

from ml.models.risk_forecasting import forecast_risk, linear_trend_forecast, moving_average  # noqa: E402


def main() -> None:
    rng = np.random.default_rng(26105)
    base = np.linspace(60, 78, 40) + rng.normal(0, 1.2, 40)
    series = np.clip(base, 0, 100)
    train, holdout = series[:-7], series[-7:]
    naive = np.full_like(holdout, train[-1])
    trend = np.array([linear_trend_forecast(train, step + 1) for step in range(7)])
    result = forecast_risk(train.tolist())
    metrics = {
        "model_name": "risk_forecasting",
        "model_version": "v1.0",
        "evaluation_dataset": "Synthetic demonstration data",
        "naive_mae": round(float(mean_absolute_error(holdout, naive)), 4),
        "linear_mae": round(float(mean_absolute_error(holdout, trend)), 4),
        "moving_average_last": round(moving_average(train), 2),
        "forecast_status": result.get("status"),
        "forecast": result.get("forecast"),
    }
    out = ROOT / "artifacts" / "risk_forecasting_metrics.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
