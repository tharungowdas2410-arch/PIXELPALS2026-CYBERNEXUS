"""Explainable risk forecasting. Requires a real history; does not invent series."""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

MIN_HISTORY = 14
HORIZONS = {"7_days": 7, "30_days": 30, "90_days": 90}


def _as_series(history: list[float]) -> np.ndarray:
    return np.array([float(value) for value in history], dtype=float)


def moving_average(series: np.ndarray, window: int = 7) -> float:
    span = min(window, len(series))
    return float(np.mean(series[-span:]))


def exponential_smoothing(series: np.ndarray, alpha: float = 0.35) -> float:
    level = float(series[0])
    for value in series[1:]:
        level = alpha * float(value) + (1.0 - alpha) * level
    return level


def linear_trend_forecast(series: np.ndarray, steps: int) -> float:
    x = np.arange(len(series)).reshape(-1, 1)
    model = LinearRegression()
    model.fit(x, series)
    future = np.array([[len(series) - 1 + steps]])
    return float(np.clip(model.predict(future)[0], 0, 100))


def lag_forest_forecast(series: np.ndarray, steps: int, seed: int = 26105) -> float | None:
    if len(series) < MIN_HISTORY + 5:
        return None
    lags = 7
    rows = []
    targets = []
    for index in range(lags, len(series)):
        rows.append(series[index - lags : index])
        targets.append(series[index])
    model = RandomForestRegressor(n_estimators=40, max_depth=5, random_state=seed, n_jobs=1)
    model.fit(np.array(rows), np.array(targets))
    window = list(series[-lags:])
    value = float(series[-1])
    for _ in range(steps):
        value = float(np.clip(model.predict([window])[0], 0, 100))
        window = window[1:] + [value]
    return value


def forecast_risk(history: list[float], *, seed: int = 26105) -> dict[str, Any]:
    if len(history) < MIN_HISTORY:
        return {
            "status": "insufficient_historical_data",
            "message": "insufficient historical data",
            "required_points": MIN_HISTORY,
            "available_points": len(history),
            "illustrative": True,
        }
    series = _as_series(history)
    current = float(series[-1])
    naive = np.full(len(series) - 1, series[0])
    naive_mae = float(mean_absolute_error(series[1:], naive)) if len(series) > 1 else 0.0
    ma = moving_average(series)
    es = exponential_smoothing(series)
    forecast = {}
    for key, steps in HORIZONS.items():
        linear = linear_trend_forecast(series, steps)
        forest = lag_forest_forecast(series, steps, seed=seed)
        # Blend linear trend with smoothing; RF used when enough lags exist.
        blended = 0.55 * linear + 0.25 * es + 0.20 * ma
        if forest is not None:
            blended = 0.5 * blended + 0.5 * forest
        forecast[key] = round(float(np.clip(blended, 0, 100)), 2)
    delta = forecast["30_days"] - current
    if delta > 1.5:
        trend = "INCREASING"
    elif delta < -1.5:
        trend = "DECREASING"
    else:
        trend = "STABLE"
    # Confidence is 1 / (1 + naive MAE/scale), computed from the series — not invented.
    confidence = round(float(1.0 / (1.0 + naive_mae / 10.0)), 4)
    return {
        "status": "ok",
        "current_risk": round(current, 2),
        "forecast": forecast,
        "trend": trend,
        "confidence": confidence,
        "baseline_naive_mae": round(naive_mae, 4),
        "methods": ["moving_average", "exponential_smoothing", "linear_trend", "random_forest_lags"],
        "illustrative": True,
    }
