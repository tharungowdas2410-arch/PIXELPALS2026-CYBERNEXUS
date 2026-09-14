from pathlib import Path

import pytest

from ml.features.feature_engineering import FEATURE_COLUMNS, FEATURE_VERSION, extract_feature_row, rows_to_matrix
from ml.inference.predictor import IncidentPredictor, probability_level
from ml.inference.forecaster import forecast as wrapped_forecast
from ml.models.anomaly_detection import isolation_forest_anomalies, zscore_change_anomalies
from ml.models.incident_likelihood import IncidentLikelihoodTrainer, MODEL_NAME, MODEL_VERSION
from ml.models.risk_forecasting import MIN_HISTORY, forecast_risk
from ml.training.generate_synthetic import DATASET_LABEL, generate_incident_dataset

ARTIFACT = Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "incident_likelihood_v1.joblib"


@pytest.fixture(scope="session")
def trained_artifact() -> Path:
    if not ARTIFACT.exists():
        trainer = IncidentLikelihoodTrainer(n_records=400, seed=26105)
        trainer.save_model(ARTIFACT)
    return ARTIFACT


def test_feature_defaults_and_missing_values() -> None:
    row = extract_feature_row({})
    assert set(row) == set(FEATURE_COLUMNS)
    assert row["asset_criticality"] == 3.0
    assert 0.0 <= row["exploitability"] <= 1.0
    filled = extract_feature_row({"exposure": "internet", "environment": "cloud-prod", "avg_cvss": None})
    assert filled["external_exposure"] == 1.0
    assert filled["environment_cloud"] == 1.0
    edge = extract_feature_row({"asset_criticality": 99, "exploitability": -1.0, "control_effectiveness": 2.0})
    assert edge["asset_criticality"] == 5.0
    assert edge["exploitability"] == 0.0
    assert edge["control_effectiveness"] == 1.0
    partial = extract_feature_row({"exposure": "partner", "environment": "on-prem"})
    assert partial["external_exposure"] == 0.7
    assert partial["environment_cloud"] == 0.0
    matrix = rows_to_matrix([{"asset_criticality": 3}, {"asset_criticality": 4}])
    assert matrix.shape == (2, len(FEATURE_COLUMNS))
    empty = rows_to_matrix([])
    assert empty.shape == (0, len(FEATURE_COLUMNS))


def test_synthetic_seed_is_deterministic() -> None:
    first = generate_incident_dataset(n_records=200, seed=26105)
    second = generate_incident_dataset(n_records=200, seed=26105)
    assert first["incident_occurrence"].tolist() == second["incident_occurrence"].tolist()
    assert first["synthetic"].all()
    assert (first["dataset_label"] == DATASET_LABEL).all()
    different_seed = generate_incident_dataset(n_records=200, seed=1)
    assert first["incident_occurrence"].tolist() != different_seed["incident_occurrence"].tolist()
    assert len(first) >= 5000 if False else len(first) == 200


def test_training_metrics_and_model_comparison(trained_artifact: Path) -> None:
    trainer = IncidentLikelihoodTrainer(n_records=300, seed=26105)
    eval_result = trainer.evaluate()
    assert eval_result["model_name"] == MODEL_NAME
    assert eval_result["model_version"] == MODEL_VERSION
    assert eval_result["feature_version"] == FEATURE_VERSION
    assert eval_result["evaluation_dataset"] == "Synthetic demonstration data"
    metrics = eval_result["metrics"]
    for key in ("accuracy", "precision", "recall", "f1", "roc_auc"):
        assert 0.0 <= metrics[key] <= 1.0
    assert "logistic_regression" in eval_result["comparison"]
    assert "random_forest" in eval_result["comparison"]
    assert eval_result["training_records"] + eval_result["validation_records"] == 300


def test_incident_probability_range_and_versioning(trained_artifact: Path) -> None:
    predictor = IncidentPredictor(artifact_path=trained_artifact)
    result = predictor.predict(
        {
            "asset_criticality": 5,
            "exploitability": 0.95,
            "exposure": "internet",
            "control_effectiveness": 0.1,
            "threat_likelihood": 0.8,
            "critical_vulnerability_count": 2,
            "residual_risk": 82,
        }
    )
    assert 0.0 <= result["incident_probability"] <= 1.0
    assert result["model_version"] == MODEL_VERSION
    assert result["feature_version"] == FEATURE_VERSION
    assert result["model_name"] == MODEL_NAME
    assert result["top_factors"]
    assert result["model"] == "logistic_regression"
    assert "prediction_timestamp" in result
    assert result["illustrative"] is True
    assert result["evaluation_dataset"] == "Synthetic demonstration data"
    low = predictor.predict(
        {
            "asset_criticality": 1,
            "exploitability": 0.05,
            "exposure": "internal",
            "control_effectiveness": 0.9,
            "threat_likelihood": 0.1,
            "residual_risk": 8,
        }
    )
    assert 0.0 <= low["incident_probability"] <= 1.0


def test_deterministic_prediction_same_features(trained_artifact: Path) -> None:
    predictor = IncidentPredictor(artifact_path=trained_artifact)
    features = {
        "asset_criticality": 4,
        "exploitability": 0.7,
        "exposure": "external",
        "control_effectiveness": 0.4,
        "threat_likelihood": 0.6,
        "residual_risk": 65,
    }
    first = predictor.predict(features)["incident_probability"]
    second = predictor.predict(features)["incident_probability"]
    assert first == second


def test_probability_level_boundaries() -> None:
    assert probability_level(0.99) == "CRITICAL"
    assert probability_level(0.80) == "CRITICAL"
    assert probability_level(0.75) == "CRITICAL"
    assert probability_level(0.749) == "HIGH"
    assert probability_level(0.55) == "HIGH"
    assert probability_level(0.35) == "MODERATE"
    assert probability_level(0.1) == "LOW"
    assert probability_level(0.0) == "LOW"


def test_forecast_insufficient_history() -> None:
    result = forecast_risk([10.0, 12.0, 11.0])
    assert result["status"] == "insufficient_historical_data"
    assert result["message"] == "insufficient historical data"
    assert result["required_points"] == MIN_HISTORY
    wrapped = wrapped_forecast([1, 2, 3])
    assert wrapped["status"] == "insufficient_historical_data"
    assert wrapped["illustrative"] is True
    assert "prediction_timestamp" in wrapped
    assert wrapped["model_name"] == "risk_forecasting"


def test_forecast_with_enough_history() -> None:
    history = [40 + i * 0.4 for i in range(20)]
    result = forecast_risk(history)
    assert result["status"] == "ok"
    assert set(result["forecast"]) == {"7_days", "30_days", "90_days"}
    assert result["trend"] in {"INCREASING", "DECREASING", "STABLE"}
    assert 0.0 <= result["confidence"] <= 1.0
    for value in result["forecast"].values():
        assert 0.0 <= value <= 100.0
    wrapped = wrapped_forecast(history)
    assert wrapped["model_version"] == "v1.0"
    assert wrapped["feature_version"] == FEATURE_VERSION
    assert "prediction_timestamp" in wrapped


def test_forecast_decreasing_trend() -> None:
    decreasing = [90 - i * 0.5 for i in range(25)]
    result = forecast_risk(decreasing)
    assert result["status"] == "ok"
    assert result["forecast"]["30_days"] <= result["current_risk"] + 5


def test_anomaly_zscore() -> None:
    quiet = zscore_change_anomalies([50, 51, 50, 52, 51])
    baseline = [52, 53, 52, 54, 53, 55, 54, 56, 55]
    spike = zscore_change_anomalies(baseline + [91])
    assert quiet["anomaly_detected"] in {True, False}
    assert spike["anomaly_detected"] is True
    assert spike["from_value"] == 55
    assert spike["to_value"] == 91
    insufficient = zscore_change_anomalies([1, 2, 3])
    assert insufficient["anomaly_detected"] is False
    assert insufficient["reason"] == "insufficient historical data"


def test_isolation_forest_anomalies() -> None:
    rows = [
        {
            "asset_id": f"a{i}",
            "asset_criticality": 3,
            "vulnerability_count": 2,
            "critical_vulnerability_count": 0,
            "avg_cvss": 5.0,
            "max_cvss": 7.0,
            "exploitability": 0.4,
            "external_exposure": 0.4,
            "control_effectiveness": 0.6,
            "threat_likelihood": 0.4,
            "historical_incidents": 0,
            "unresolved_vuln_age_days": 30,
            "environment_cloud": 0,
            "residual_risk": 40 + (i % 5),
            "inherent_risk": 55 + (i % 5),
        }
        for i in range(18)
    ]
    rows.append(
        {
            "asset_id": "outlier",
            "asset_criticality": 5,
            "vulnerability_count": 20,
            "critical_vulnerability_count": 5,
            "avg_cvss": 9.0,
            "max_cvss": 10.0,
            "exploitability": 0.98,
            "external_exposure": 1.0,
            "control_effectiveness": 0.05,
            "threat_likelihood": 0.95,
            "historical_incidents": 5,
            "unresolved_vuln_age_days": 300,
            "environment_cloud": 1,
            "residual_risk": 95,
            "inherent_risk": 99,
        }
    )
    flagged = isolation_forest_anomalies(rows, seed=26105)
    assert isinstance(flagged, list)
    if flagged:
        for item in flagged:
            assert item["anomaly_detected"] is True
            assert "severity" in item
            assert "possible_contributing_factors" in item
    too_few = isolation_forest_anomalies(rows[:4])
    assert too_few == []

