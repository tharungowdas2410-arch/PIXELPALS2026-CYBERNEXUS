from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from ml.features.feature_engineering import (
    FEATURE_COLUMNS,
    FEATURE_LABELS,
    FEATURE_VERSION,
    extract_feature_row,
    row_to_vector,
)
from ml.models.incident_likelihood import MODEL_NAME, MODEL_VERSION

ARTIFACT = Path(__file__).resolve().parents[1] / "artifacts" / "incident_likelihood_v1.joblib"


def probability_level(probability: float) -> str:
    if probability >= 0.75:
        return "CRITICAL"
    if probability >= 0.55:
        return "HIGH"
    if probability >= 0.35:
        return "MODERATE"
    return "LOW"


def explain_logistic(coefficients: np.ndarray, row: dict[str, float]) -> list[str]:
    contributions: list[tuple[float, str]] = []
    for name, coef, value in zip(FEATURE_COLUMNS, coefficients, (row[col] for col in FEATURE_COLUMNS)):
        signed = float(coef) * float(value)
        if name == "control_effectiveness":
            # Lower effectiveness increases risk; invert the displayed driver.
            signed = -signed
        contributions.append((signed, FEATURE_LABELS[name]))
    contributions.sort(key=lambda item: item[0], reverse=True)
    return [label for score, label in contributions if score > 0][:4] or [contributions[0][1]]


class IncidentPredictor:
    def __init__(self, artifact_path: Path | None = None) -> None:
        self.artifact_path = artifact_path or ARTIFACT
        self._payload: dict[str, Any] | None = None

    def load(self) -> dict[str, Any]:
        if self._payload is None:
            if not self.artifact_path.exists():
                raise FileNotFoundError(
                    f"Trained model not found at {self.artifact_path}. Run ml/training/train_incident_model.py"
                )
            self._payload = joblib.load(self.artifact_path)
        return self._payload

    def predict(self, raw_features: dict[str, Any]) -> dict[str, Any]:
        payload = self.load()
        pipeline = payload["pipeline"]
        row = extract_feature_row(raw_features)
        vector = row_to_vector(row).reshape(1, -1)
        probability = float(pipeline.predict_proba(vector)[0, 1])
        probability = min(1.0, max(0.0, probability))
        scaler = pipeline.named_steps["scaler"]
        model = pipeline.named_steps["model"]
        scaled = scaler.transform(vector)[0]
        coef = model.coef_[0] * scaled
        return {
            "incident_probability": round(probability, 4),
            "risk_level": probability_level(probability),
            "top_factors": explain_logistic(coef, row),
            "model": "logistic_regression",
            "model_name": payload.get("model_name", MODEL_NAME),
            "model_version": payload.get("model_version", MODEL_VERSION),
            "feature_version": payload.get("feature_version", FEATURE_VERSION),
            "prediction_timestamp": datetime.now(UTC).isoformat(),
            "features": row,
            "evaluation_dataset": "Synthetic demonstration data",
            "illustrative": True,
        }


predictor = IncidentPredictor()
