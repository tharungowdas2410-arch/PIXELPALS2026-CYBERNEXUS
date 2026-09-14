import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


async def _asset(client: AsyncClient, headers: dict[str, str]) -> str:
    created = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={
            "name": "Payment API",
            "asset_type": "application",
            "criticality": 5,
            "business_value": 25000000,
            "exposure": "internet",
            "environment": "cloud",
        },
    )
    assert created.status_code == 201
    return created.json()["data"]["id"]


@pytest.mark.asyncio
async def test_ml_status_and_predict(client: AsyncClient) -> None:
    headers = await auth_headers(client, email="ml@example.com")
    status = await client.get("/api/v1/ml/status", headers=headers)
    assert status.status_code == 200
    status_body = status.json()["data"]
    assert status_body["incident_model_ready"] is True
    assert status_body["model_name"] == "incident_likelihood"
    assert status_body["illustrative"] is True
    asset_id = await _asset(client, headers)
    await client.post(
        "/api/v1/vulnerabilities",
        headers=headers,
        json={
            "asset_id": asset_id,
            "title": "Auth bypass",
            "cvss_score": 9.8,
            "exploitability": 0.9,
            "severity": "critical",
        },
    )
    prediction = await client.post(
        "/api/v1/ml/predict-incident",
        headers=headers,
        json={"asset_id": asset_id},
    )
    assert prediction.status_code == 200
    body = prediction.json()["data"]
    assert 0.0 <= body["incident_probability"] <= 1.0
    assert body["model_version"]
    assert body["feature_version"]
    assert body["illustrative"] is True
    assert "model_name" in body
    assert "asset_name" in body
    assert "deterministic_residual_risk" in body
    assert "disclaimer" in body
    assert "top_factors" in body
    assert isinstance(body["top_factors"], list)


@pytest.mark.asyncio
async def test_ml_forecast_insufficient_and_override(client: AsyncClient) -> None:
    headers = await auth_headers(client, email="forecast@example.com")
    empty = await client.post("/api/v1/ml/forecast-risk", headers=headers, json={})
    assert empty.status_code == 200
    empty_body = empty.json()["data"]
    assert empty_body["status"] == "insufficient_historical_data"
    assert "illustrative" in empty_body
    series = [40 + i * 0.5 for i in range(20)]
    filled = await client.post("/api/v1/ml/forecast-risk", headers=headers, json={"history": series})
    assert filled.status_code == 200
    payload = filled.json()["data"]
    assert payload["status"] == "ok"
    assert "30_days" in payload["forecast"]
    assert "trend" in payload
    assert "confidence" in payload
    assert "model_version" in payload


@pytest.mark.asyncio
async def test_ml_signals_anomalies_performance(client: AsyncClient) -> None:
    headers = await auth_headers(client, email="signals@example.com")
    await _asset(client, headers)
    signals = await client.get("/api/v1/ml/risk-signals", headers=headers)
    assert signals.status_code == 200
    signals_body = signals.json()["data"]
    assert "signals" in signals_body
    assert "model_name" in signals_body
    assert "disclaimer" in signals_body
    assert signals_body["illustrative"] is True
    anomalies = await client.get("/api/v1/ml/anomalies", headers=headers)
    assert anomalies.status_code == 200
    anomalies_body = anomalies.json()["data"]
    assert "series_anomaly" in anomalies_body
    assert "asset_anomalies" in anomalies_body
    assert "anomaly_detected" in anomalies_body
    performance = await client.get("/api/v1/ml/model-performance", headers=headers)
    assert performance.status_code == 200
    metrics = performance.json()["data"]
    assert "metrics" in metrics
    assert metrics["evaluation_dataset"] == "Synthetic demonstration data"
    assert "training_records" in metrics
    assert "validation_records" in metrics
    assert "comparison" in metrics
    assert "disclaimer" in metrics


@pytest.mark.asyncio
async def test_ml_api_validation_requires_auth(client: AsyncClient) -> None:
    status = await client.get("/api/v1/ml/status")
    assert status.status_code in (401, 403)


@pytest.mark.asyncio
async def test_ml_predict_incident_requires_asset_id(client: AsyncClient) -> None:
    headers = await auth_headers(client, email="validatorml@example.com")
    bad_uuid = await client.post(
        "/api/v1/ml/predict-incident",
        headers=headers,
        json={"asset_id": "not-a-uuid"},
    )
    assert bad_uuid.status_code == 422
    missing = await client.post(
        "/api/v1/ml/predict-incident",
        headers=headers,
        json={"vulnerability_ids": []},
    )
    assert missing.status_code == 422
    unknown_asset = await client.post(
        "/api/v1/ml/predict-incident",
        headers=headers,
        json={"asset_id": str(uuid.uuid4())},
    )
    assert unknown_asset.status_code in (404, 422, 500)

