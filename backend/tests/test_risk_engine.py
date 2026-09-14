import pytest
from httpx import AsyncClient

from app.services.risk_engine import quantify_risk
from app.utils.calculations import (
    FORMULAS,
    applied_control_effectiveness,
    exposure_factor,
    inherent_risk,
    residual_risk,
    risk_level,
    threat_sophistication_factor,
)
from tests.conftest import auth_headers


def test_formulas_are_documented() -> None:
    assert "likelihood" in FORMULAS["inherent_risk"]
    assert "applied_control_effectiveness" in FORMULAS["residual_risk"]
    assert inherent_risk(likelihood=1, impact=1, criticality=5, exploitability=1) == 100
    assert residual_risk(100, 0.5) == 50
    assert exposure_factor("internet") == 1.0
    assert exposure_factor("internal") == 0.75
    assert threat_sophistication_factor(None) == 1.0
    assert threat_sophistication_factor(1) == 1.0
    assert threat_sophistication_factor(0) == 0.85
    assert applied_control_effectiveness(0.8, "implemented") == 0.8
    assert applied_control_effectiveness(0.8, "planned") == 0.0
    assert applied_control_effectiveness(0.8, "partial") == 0.4


def test_quantify_chain_is_deterministic() -> None:
    first = quantify_risk(
        likelihood=0.95,
        impact=0.95,
        criticality=5,
        exploitability=0.95,
        control_effectiveness=0.0,
        exposure="internet",
        vulnerability_severity="critical",
    )
    second = quantify_risk(
        likelihood=0.95,
        impact=0.95,
        criticality=5,
        exploitability=0.95,
        control_effectiveness=0.0,
        exposure="internet",
        vulnerability_severity="critical",
    )
    assert first.inherent_risk == 85.74
    assert first.residual_risk == 85.74
    assert first.risk_level.value == "CRITICAL"
    assert first == second
    assert "High asset criticality" in first.drivers
    assert any(item.key == "exploitability" for item in first.factors)
    treated = quantify_risk(
        likelihood=0.95,
        impact=0.95,
        criticality=5,
        exploitability=0.95,
        control_effectiveness=0.5,
        exposure="internet",
        implementation_status="implemented",
    )
    assert treated.residual_risk == 42.87
    assert treated.risk_level == risk_level(42.87)
    planned = quantify_risk(
        likelihood=0.95,
        impact=0.95,
        criticality=5,
        exploitability=0.95,
        control_effectiveness=0.5,
        exposure="internet",
        implementation_status="planned",
    )
    assert planned.residual_risk == first.residual_risk


@pytest.mark.asyncio
async def test_risk_engine_api_and_dashboard(client: AsyncClient) -> None:
    headers = await auth_headers(client, email="risk-engine@example.com")
    asset = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={
            "name": "VPN",
            "asset_type": "network_device",
            "criticality": 5,
            "business_value": 10000000,
            "exposure": "internet",
            "data_sensitivity": "confidential",
        },
    )
    asset_id = asset.json()["data"]["id"]
    other = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={"name": "Printer", "asset_type": "endpoint", "criticality": 1, "business_value": 1000, "exposure": "internal"},
    )
    vuln = await client.post(
        "/api/v1/vulnerabilities",
        headers=headers,
        json={
            "asset_id": asset_id,
            "title": "Auth bypass",
            "severity": "critical",
            "exploitability": 0.95,
            "cvss_score": 9.8,
        },
    )
    threat = await client.post(
        "/api/v1/threats",
        headers=headers,
        json={"name": "Credential stuffing", "category": "identity", "likelihood": 0.7, "sophistication": 0.8},
    )
    control = await client.post(
        "/api/v1/controls",
        headers=headers,
        json={
            "name": "MFA",
            "framework": "NIST CSF",
            "category": "identity",
            "effectiveness": 0.5,
            "implementation_status": "implemented",
            "annual_cost": 120000,
        },
    )
    calc = await client.post(
        "/api/v1/risks/calculate",
        headers=headers,
        json={
            "asset_id": asset_id,
            "vulnerability_id": vuln.json()["data"]["id"],
            "threat_id": threat.json()["data"]["id"],
            "control_id": control.json()["data"]["id"],
            "likelihood": 0.95,
            "impact": 0.95,
        },
    )
    assert calc.status_code == 200
    body = calc.json()["data"]
    assert body["inherent_risk"] > body["residual_risk"]
    assert body["formula_trace"]
    assert body["formulas"]["residual_risk"]
    assert body["chain"]["asset"]["name"] == "VPN"
    assert body["chain"]["vulnerability"]["title"] == "Auth bypass"
    assert body["chain"]["threat"]["name"] == "Credential stuffing"
    assert body["chain"]["control"]["name"] == "MFA"
    assert any(factor["key"] == "applied_control_effectiveness" for factor in body["factors"])
    risk_id = body["persisted"]["id"]

    listed = await client.get("/api/v1/risks", headers=headers)
    assert listed.json()["total"] == 1
    assert listed.json()["data"][0]["risk_level"]
    assert listed.json()["data"][0]["inherent_risk"] == body["inherent_risk"]

    detail = await client.get(f"/api/v1/risks/{risk_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["data"]["chain"]["organization_id"]
    assert detail.json()["data"]["factors"]

    summary = await client.get("/api/v1/risks/summary", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["data"]["count"] == 1
    assert summary.json()["data"]["linked_chain_complete"] == 1
    assert summary.json()["data"]["by_level"]

    overview = await client.get("/api/v1/dashboard/overview", headers=headers)
    assert overview.status_code == 200
    data = overview.json()["data"]
    assert data["open_risk_count"] == 1
    assert data["formulas"]["inherent_risk"]
    assert data["top_risk_contributors"][0]["id"] == risk_id

    mismatch = await client.post(
        "/api/v1/risks/calculate",
        headers=headers,
        json={
            "asset_id": other.json()["data"]["id"],
            "vulnerability_id": vuln.json()["data"]["id"],
            "likelihood": 0.2,
            "impact": 0.2,
        },
    )
    assert mismatch.status_code == 400
