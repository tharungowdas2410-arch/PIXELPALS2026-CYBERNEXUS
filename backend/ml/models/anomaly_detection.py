"""Anomaly detection for unusual residual-risk changes."""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest

from ml.features.feature_engineering import FEATURE_COLUMNS, rows_to_matrix


def zscore_change_anomalies(series: list[float], *, z_threshold: float = 2.5) -> dict[str, Any]:
    if len(series) < 4:
        return {
            "anomaly_detected": False,
            "reason": "insufficient historical data",
            "points": len(series),
        }
    values = np.array(series, dtype=float)
    diffs = np.diff(values)
    mean = float(np.mean(diffs))
    std = float(np.std(diffs)) or 1.0
    last_change = float(diffs[-1])
    z_score = (last_change - mean) / std
    detected = abs(z_score) >= z_threshold
    return {
        "anomaly_detected": detected,
        "method": "zscore_change",
        "severity": "CRITICAL" if abs(z_score) >= 3.5 else "HIGH" if detected else "LOW",
        "risk_change": round(last_change, 2),
        "z_score": round(float(z_score), 3),
        "from_value": round(float(values[-2]), 2),
        "to_value": round(float(values[-1]), 2),
    }


def isolation_forest_anomalies(
    feature_rows: list[dict[str, Any]],
    *,
    seed: int = 26105,
    contamination: float = 0.12,
) -> list[dict[str, Any]]:
    if len(feature_rows) < 8:
        return []
    matrix = rows_to_matrix(feature_rows)
    model = IsolationForest(
        n_estimators=80,
        contamination=contamination,
        random_state=seed,
    )
    labels = model.fit_predict(matrix)
    scores = model.decision_function(matrix)
    flagged = []
    for index, (label, score, row) in enumerate(zip(labels, scores, feature_rows)):
        if label != -1:
            continue
        flagged.append(
            {
                "index": index,
                "asset_id": row.get("asset_id"),
                "anomaly_detected": True,
                "severity": "HIGH" if score < -0.05 else "MODERATE",
                "isolation_score": round(float(score), 4),
                "residual_risk": row.get("residual_risk"),
                "possible_contributing_factors": _factors(row),
            }
        )
    return flagged


def _factors(row: dict[str, Any]) -> list[str]:
    hints = []
    if float(row.get("external_exposure") or 0) >= 0.9:
        hints.append("External exposure")
    if float(row.get("critical_vulnerability_count") or 0) >= 1:
        hints.append("Critical vulnerability")
    if float(row.get("exploitability") or 0) >= 0.6:
        hints.append("High exploitability")
    if float(row.get("control_effectiveness") or 0) < 0.4:
        hints.append("Weak control effectiveness")
    if float(row.get("residual_risk") or 0) >= 75:
        hints.append("Elevated residual risk")
    return hints or ["Unusual feature combination versus peer assets"]


__all__ = ["FEATURE_COLUMNS", "zscore_change_anomalies", "isolation_forest_anomalies"]
