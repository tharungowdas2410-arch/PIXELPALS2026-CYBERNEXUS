"""Reusable feature engineering for ML risk models. Feature version v1."""

from __future__ import annotations

from typing import Any, Mapping

import numpy as np

FEATURE_VERSION = "v1"

FEATURE_COLUMNS: tuple[str, ...] = (
    "asset_criticality",
    "vulnerability_count",
    "critical_vulnerability_count",
    "avg_cvss",
    "max_cvss",
    "exploitability",
    "external_exposure",
    "control_effectiveness",
    "threat_likelihood",
    "historical_incidents",
    "unresolved_vuln_age_days",
    "environment_cloud",
    "residual_risk",
    "inherent_risk",
)

FEATURE_LABELS: dict[str, str] = {
    "asset_criticality": "High asset criticality",
    "vulnerability_count": "Vulnerability volume",
    "critical_vulnerability_count": "Critical vulnerability",
    "avg_cvss": "Elevated average CVSS",
    "max_cvss": "High maximum CVSS",
    "exploitability": "High exploitability",
    "external_exposure": "External exposure",
    "control_effectiveness": "Weak control effectiveness",
    "threat_likelihood": "Elevated threat likelihood",
    "historical_incidents": "Historical incidents",
    "unresolved_vuln_age_days": "Aging unresolved findings",
    "environment_cloud": "Cloud-facing environment",
    "residual_risk": "High residual risk",
    "inherent_risk": "High inherent risk",
}

DEFAULTS: dict[str, float] = {name: 0.0 for name in FEATURE_COLUMNS}
DEFAULTS.update(
    {
        "asset_criticality": 3.0,
        "control_effectiveness": 0.3,
        "exploitability": 0.3,
    }
)

EXTERNAL_KEYS = {"internet", "external", "public"}
CLOUD_KEYS = {"cloud", "production", "prod", "hybrid"}


def _num(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if number != number:  # NaN
        return default
    return number


def encode_exposure(exposure: str | None) -> float:
    if not exposure:
        return 0.4
    key = str(exposure).strip().lower()
    if key in EXTERNAL_KEYS:
        return 1.0
    if key in {"partner", "vendor"}:
        return 0.7
    if key in {"internal", "private"}:
        return 0.2
    return 0.4


def encode_environment(environment: str | None) -> float:
    if not environment:
        return 0.0
    key = str(environment).strip().lower()
    return 1.0 if any(token in key for token in CLOUD_KEYS) else 0.0


def extract_feature_row(raw: Mapping[str, Any]) -> dict[str, float]:
    """Map a telemetry-like dict into the v1 feature schema. Missing values are filled."""
    row = {name: _num(raw.get(name), DEFAULTS[name]) for name in FEATURE_COLUMNS}
    if "external_exposure" not in raw or raw.get("external_exposure") is None:
        if "exposure" in raw:
            row["external_exposure"] = encode_exposure(str(raw.get("exposure") or ""))
    else:
        value = raw.get("external_exposure")
        row["external_exposure"] = (
            encode_exposure(str(value)) if isinstance(value, str) else _num(value, 0.4)
        )
    if "environment_cloud" not in raw or raw.get("environment_cloud") is None:
        row["environment_cloud"] = encode_environment(str(raw.get("environment") or ""))
    row["asset_criticality"] = min(5.0, max(1.0, row["asset_criticality"]))
    row["exploitability"] = min(1.0, max(0.0, row["exploitability"]))
    row["control_effectiveness"] = min(1.0, max(0.0, row["control_effectiveness"]))
    row["threat_likelihood"] = min(1.0, max(0.0, row["threat_likelihood"]))
    row["residual_risk"] = min(100.0, max(0.0, row["residual_risk"]))
    row["inherent_risk"] = min(100.0, max(0.0, row["inherent_risk"]))
    row["avg_cvss"] = min(10.0, max(0.0, row["avg_cvss"]))
    row["max_cvss"] = min(10.0, max(0.0, row["max_cvss"]))
    row["vulnerability_count"] = max(0.0, row["vulnerability_count"])
    row["critical_vulnerability_count"] = max(0.0, row["critical_vulnerability_count"])
    row["historical_incidents"] = max(0.0, row["historical_incidents"])
    row["unresolved_vuln_age_days"] = max(0.0, row["unresolved_vuln_age_days"])
    return row


def row_to_vector(row: Mapping[str, float]) -> np.ndarray:
    filled = extract_feature_row(row)
    return np.array([filled[name] for name in FEATURE_COLUMNS], dtype=float)


def rows_to_matrix(rows: list[Mapping[str, Any]]) -> np.ndarray:
    if not rows:
        return np.zeros((0, len(FEATURE_COLUMNS)), dtype=float)
    return np.vstack([row_to_vector(item) for item in rows])
