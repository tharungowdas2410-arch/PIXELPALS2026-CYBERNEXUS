"""Tests for SIH 2026 Judge Demo Controller and Scenario Reset."""

import pytest
from httpx import AsyncClient


async def get_admin_headers(client: AsyncClient) -> dict[str, str]:
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "demo_test_admin@northbridge.example",
            "password": "ValidPassword_2026!",
            "full_name": "Demo Admin",
            "organization_name": "Demo Bank Ltd",
            "role": "admin",
        },
    )
    if res.status_code == 201:
        token = res.json()["data"]["access_token"]
    else:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo_test_admin@northbridge.example", "password": "ValidPassword_2026!"},
        )
        token = login.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_demo_state_retrieval(client: AsyncClient):
    """Retrieve demo state and verify 11 scenes are available."""
    headers = await get_admin_headers(client)
    res = await client.get("/api/v1/demo/state", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["demo_mode"] is True
    assert data["active_scene"] >= 1
    assert len(data["scenes"]) == 11
    assert data["scenes"][0]["title"] == "Normal State"
    assert data["scenes"][10]["title"] == "Executive Report Generated"


@pytest.mark.asyncio
async def test_demo_scene_transitions_and_reset(client: AsyncClient):
    """Trigger scene 2 (attack begins), scene 3 (vulnerability appears), then reset to baseline."""
    headers = await get_admin_headers(client)

    # 1. Trigger Scene 2 (Attack begins)
    s2_res = await client.post("/api/v1/demo/scene/2", headers=headers)
    assert s2_res.status_code == 200
    s2_data = s2_res.json()["data"]
    assert s2_data["scene_id"] == 2
    assert "Attack Begins" in s2_data["scene_title"]

    # 2. Trigger Scene 3 (Vulnerability appears, risk spikes to 84)
    s3_res = await client.post("/api/v1/demo/scene/3", headers=headers)
    assert s3_res.status_code == 200
    s3_data = s3_res.json()["data"]
    assert s3_data["scene_id"] == 3
    assert s3_data["current_risk"] == 84.0

    # 3. Check State reflects active scene 3
    state_res = await client.get("/api/v1/demo/state", headers=headers)
    assert state_res.status_code == 200
    assert state_res.json()["data"]["active_scene"] == 3
    assert state_res.json()["data"]["current_risk"] == 84.0

    # 4. Trigger Demo Reset
    reset_res = await client.post("/api/v1/demo/reset", headers=headers)
    assert reset_res.status_code == 200
    reset_data = reset_res.json()["data"]
    assert reset_data["status"] == "RESET_SUCCESSFUL"
    assert reset_data["active_scene"] == 1

    # 5. Verify State returned to Scene 1 baseline
    state_after = await client.get("/api/v1/demo/state", headers=headers)
    assert state_after.json()["data"]["active_scene"] == 1
    assert state_after.json()["data"]["current_risk"] == 72.0
    assert state_after.json()["data"]["expected_annual_loss"] == 4_500_000.0
    assert state_after.json()["data"]["total_financial_exposure"] == 48_200_000.0


@pytest.mark.asyncio
async def test_all_11_demo_scenes_and_financial_contract(client: AsyncClient):
    """Test every one of the 11 demo scenes and verify financial risk contract is never undefined."""
    headers = await get_admin_headers(client)

    # Verify initial scene 1 contract
    state_res = await client.get("/api/v1/demo/state", headers=headers)
    assert state_res.status_code == 200
    state = state_res.json()["data"]
    assert state["expected_annual_loss"] > 0
    assert state["total_financial_exposure"] > 0
    assert state["current_risk"] > 0

    for scene in state["scenes"]:
        assert "expected_annual_loss" in scene
        assert "total_financial_exposure" in scene
        assert "current_risk" in scene
        assert scene["expected_annual_loss"] > 0
        assert scene["total_financial_exposure"] > 0
        assert scene["current_risk"] > 0

    # Step through all 11 scenes sequentially
    for scene_id in range(1, 12):
        res = await client.post(f"/api/v1/demo/scene/{scene_id}", headers=headers)
        assert res.status_code == 200, f"Scene {scene_id} failed to trigger: {res.text}"
        data = res.json()["data"]
        assert data["scene_id"] == scene_id
        assert "expected_annual_loss" in data
        assert "total_financial_exposure" in data
        assert "current_risk" in data
        assert data["expected_annual_loss"] is not None
        assert data["total_financial_exposure"] is not None
        assert data["current_risk"] is not None

        # Verify state endpoint also reflects updated scene metrics
        cur_state = (await client.get("/api/v1/demo/state", headers=headers)).json()["data"]
        assert cur_state["active_scene"] == scene_id
        assert cur_state["expected_annual_loss"] == data["expected_annual_loss"]
        assert cur_state["total_financial_exposure"] == data["total_financial_exposure"]
        assert cur_state["current_risk"] == data["current_risk"]

    # Finally reset
    reset_res = await client.post("/api/v1/demo/reset", headers=headers)
    assert reset_res.status_code == 200
    reset_state = (await client.get("/api/v1/demo/state", headers=headers)).json()["data"]
    assert reset_state["active_scene"] == 1
    assert reset_state["expected_annual_loss"] == 4_500_000.0


@pytest.mark.asyncio
async def test_executive_report_generation_step_11(client: AsyncClient):
    """Regression test for Step 11 Executive Report generation.

    Verifies:
    1. Demo reset cleanly baselines data.
    2. Sequentially progressing through scenes 1 to 11 updates live state.
    3. GET /api/v1/reports/executive returns HTTP 200 with full nested contract:
       - report_metadata (report_id, generated_at, organization_id, disclaimer)
       - executive_summary (posture_score, posture_grade, posture_status, narrative)
       - financial_risk_quantification (total_assets, total_financial_exposure_inr, expected_annual_loss_inr, value_at_risk_95_inr, loss_exceedance_scenarios)
       - compliance_alignment (overall_score, total_requirements, frameworks, critical_gaps_count)
       - investment_recommendations (available_budget_inr, recommended_portfolio_cost_inr, projected_risk_reduction_pct, projected_loss_avoided_inr, portfolio_rosi, recommended_controls)
       - top_risk_drivers (title, severity, residual_risk, loss)
    4. GET /api/v1/reports/security-posture returns HTTP 200.
    5. Clean reset and second run also completely succeeds (contamination prevention).
    """
    headers = await get_admin_headers(client)

    for run_number in [1, 2]:
        # Step A: Clean reset
        reset_res = await client.post("/api/v1/demo/reset", headers=headers)
        assert reset_res.status_code == 200, f"Run {run_number}: Reset failed"

        # Step B: Progress through scenes 1 to 11
        for scene_id in range(1, 12):
            s_res = await client.post(f"/api/v1/demo/scene/{scene_id}", headers=headers)
            assert s_res.status_code == 200, f"Run {run_number}: Scene {scene_id} trigger failed"

        # Step C: Call Executive Report endpoint
        rep_res = await client.get("/api/v1/reports/executive", headers=headers)
        assert rep_res.status_code == 200, f"Run {run_number}: Executive report failed with status {rep_res.status_code}: {rep_res.text}"
        data = rep_res.json()["data"]

        # Validate nested contract expected by frontend
        assert "report_metadata" in data
        meta = data["report_metadata"]
        assert meta["report_id"].startswith("RPT-")
        assert "generated_at" in meta
        assert "organization_id" in meta
        assert "NOT AN OFFICIAL STATUTORY AUDIT" in meta["disclaimer"].upper()

        assert "executive_summary" in data
        summary = data["executive_summary"]
        assert isinstance(summary, dict)
        assert isinstance(summary["posture_score"], (int, float))
        assert summary["posture_grade"] in ["A", "B", "C", "D"]
        assert summary["posture_status"] in ["OPTIMAL", "STRONG", "MODERATE", "CRITICAL"]
        assert len(summary["narrative"]) > 20

        assert "financial_risk_quantification" in data
        fin = data["financial_risk_quantification"]
        assert fin["total_assets"] > 0
        assert fin["total_financial_exposure_inr"] > 0
        assert fin["expected_annual_loss_inr"] > 0
        assert fin["value_at_risk_95_inr"] > 0
        assert len(fin["loss_exceedance_scenarios"]) == 3
        for sc in fin["loss_exceedance_scenarios"]:
            assert "scenario" in sc
            assert "confidence" in sc
            assert sc["simulated_loss_inr"] > 0

        assert "compliance_alignment" in data
        comp = data["compliance_alignment"]
        assert 0 <= comp["overall_score"] <= 100
        assert comp["total_requirements"] > 0
        assert len(comp["frameworks"]) >= 3
        for fw in comp["frameworks"]:
            assert "framework" in fw
            assert "score" in fw
            assert "status" in fw

        assert "investment_recommendations" in data
        inv = data["investment_recommendations"]
        assert inv["available_budget_inr"] > 0
        assert inv["recommended_portfolio_cost_inr"] > 0
        assert inv["projected_loss_avoided_inr"] > 0
        assert inv["portfolio_rosi"] > 0
        assert len(inv["recommended_controls"]) > 0
        for ctl in inv["recommended_controls"]:
            assert "name" in ctl
            assert "category" in ctl
            assert ctl["cost"] > 0
            assert ctl["rosi"] > 0

        assert "top_risk_drivers" in data
        assert len(data["top_risk_drivers"]) > 0
        for driver in data["top_risk_drivers"]:
            assert "title" in driver
            assert "severity" in driver
            assert driver["residual_risk"] >= 0
            assert driver["loss"] >= 0

        # Validate security posture report endpoint
        posture_res = await client.get("/api/v1/reports/security-posture", headers=headers)
        assert posture_res.status_code == 200
        posture_data = posture_res.json()["data"]
        assert posture_data["total_monitored_assets"] > 0
        assert posture_data["tamper_evident_records_verified"] is True

