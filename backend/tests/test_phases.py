import pytest
from httpx import AsyncClient

from app.services.financial_engine import run_monte_carlo
from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_risk_calculate_and_dashboard(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    asset = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={"name": "VPN", "asset_type": "network_device", "criticality": 5, "business_value": 10000000, "exposure": "internet"},
    )
    asset_id = asset.json()["data"]["id"]
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
    calc = await client.post(
        "/api/v1/risks/calculate",
        headers=headers,
        json={
            "asset_id": asset_id,
            "vulnerability_id": vuln.json()["data"]["id"],
            "likelihood": 0.95,
            "impact": 0.95,
        },
    )
    assert calc.status_code == 200
    body = calc.json()["data"]
    assert body["risk_level"] == "CRITICAL"
    assert "High asset criticality" in body["drivers"]
    assert body["inherent_risk"] == 85.74
    assert body["residual_risk"] == 85.74
    listed = await client.get("/api/v1/risks", headers=headers)
    assert listed.json()["total"] == 1
    overview = await client.get("/api/v1/dashboard/overview", headers=headers)
    assert overview.status_code == 200
    assert overview.json()["data"]["active_critical_risks"] >= 1
    summary = await client.get("/api/v1/risks/summary", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["data"]["count"] == 1


@pytest.mark.asyncio
async def test_monte_carlo_is_deterministic(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    payload = {
        "expected_loss": 1_000_000,
        "min_loss": 100_000,
        "max_loss": 5_000_000,
        "probability": 0.4,
        "simulations": 2000,
        "seed": 42,
    }
    first = await client.post("/api/v1/financial/monte-carlo", headers=headers, json=payload)
    second = await client.post("/api/v1/financial/monte-carlo", headers=headers, json=payload)
    assert first.status_code == 200
    assert first.json()["data"]["mean"] == second.json()["data"]["mean"]
    assert first.json()["data"]["p95"] == run_monte_carlo(
        expected_loss=1_000_000, min_loss=100_000, max_loss=5_000_000, probability=0.4, simulations=2000, seed=42
    )["p95"]


@pytest.mark.asyncio
async def test_optimize_zero_budget(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    await client.post(
        "/api/v1/controls",
        headers=headers,
        json={"name": "MFA", "framework": "NIST CSF", "category": "identity", "effectiveness": 0.8, "annual_cost": 12},
    )
    result = await client.post("/api/v1/investments/optimize", headers=headers, json={"budget": 0})
    assert result.status_code == 200
    assert result.json()["data"]["recommended_controls"] == []
    assert result.json()["data"]["portfolio_rosi"] is None


@pytest.mark.asyncio
async def test_scenario_incident_compliance_blockchain_advisor(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    scenario = await client.post(
        "/api/v1/scenarios/simulate",
        headers=headers,
        json={"changes": ["Add MFA"], "baseline_risk": 80, "baseline_eal": 1_000_000, "control_effectiveness": 0.4, "investment_cost": 100000},
    )
    assert scenario.status_code == 200
    assert scenario.json()["data"]["scenario_risk"] < 80

    incident = await client.post(
        "/api/v1/incidents",
        headers=headers,
        json={"title": "VPN stuffing", "severity": "high"},
    )
    assert incident.status_code == 201

    evidence = await client.post(
        "/api/v1/compliance/evidence",
        headers=headers,
        json={"framework": "NIST CSF", "requirement": "PR.AC-1", "status": "partial", "score": 60},
    )
    assert evidence.status_code == 201
    summary = await client.get("/api/v1/compliance/summary", headers=headers)
    assert summary.json()["data"]["total_requirements"] == 1

    org = await client.get("/api/v1/organizations/me", headers=headers)
    org_id = org.json()["data"]["id"]
    recorded = await client.post(
        "/api/v1/blockchain/record",
        headers=headers,
        json={"evidence_type": "risk-assessment", "entity_id": org_id, "payload": "risk:vpn"},
    )
    assert recorded.status_code == 201
    digest = recorded.json()["data"]["evidence_hash"]
    verify = await client.post("/api/v1/blockchain/verify", headers=headers, json={"payload": "risk:vpn", "evidence_hash": digest})
    assert verify.json()["data"]["valid"] is True

    denied = await client.get("/api/v1/advisor/questions")
    assert denied.status_code == 401
    asked = await client.post("/api/v1/advisor/ask", headers=headers, json={"question": "What are my top risks?"})
    assert asked.status_code == 200
    assert "assumptions" in asked.json()["data"]


@pytest.mark.asyncio
async def test_invalid_uuid_on_risk(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    response = await client.get("/api/v1/risks/not-a-uuid", headers=headers)
    assert response.status_code == 422
