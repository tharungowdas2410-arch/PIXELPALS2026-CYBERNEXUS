"""End-to-End Verification of SIH 26105 Demo Mode through Step 11 Executive Report."""

import json
import sys
import urllib.request


def test_full_demo(run_num: int):
    print(f"=== STARTING DEMO RUN {run_num} ===")
    
    # 1. Login as CISO
    login_payload = json.dumps({"email": "ciso@northbridge.example", "password": "ChangeMe_demo1!"}).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/auth/login",
        data=login_payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode("utf-8"))["data"]["access_token"]
    
    auth_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # 2. Reset to baseline
    reset_req = urllib.request.Request("http://127.0.0.1:8000/api/v1/demo/reset", data=b"{}", headers=auth_headers)
    with urllib.request.urlopen(reset_req) as resp:
        reset_data = json.loads(resp.read().decode("utf-8"))["data"]
    print(f"Run {run_num}: Reset complete -> Scene {reset_data['active_scene']} ({reset_data['status']})")

    # 3. Advance through scenes 1 to 11
    for step in range(1, 12):
        s_req = urllib.request.Request(f"http://127.0.0.1:8000/api/v1/demo/scene/{step}", data=b"{}", headers=auth_headers)
        with urllib.request.urlopen(s_req) as resp:
            s_data = json.loads(resp.read().decode("utf-8"))["data"]
        print(f"  Step {step:2d}/11: {s_data['scene_title']} | Risk: {s_data.get('current_risk')} | EAL: ₹{s_data.get('expected_annual_loss'):,.0f}")

    # 4. Generate Executive Report
    rep_req = urllib.request.Request("http://127.0.0.1:8000/api/v1/reports/executive", headers=auth_headers)
    with urllib.request.urlopen(rep_req) as resp:
        assert resp.status == 200, f"Executive report failed: HTTP {resp.status}"
        report = json.loads(resp.read().decode("utf-8"))["data"]

    # Assertions on Executive Report Content
    assert report["executive_summary"]["posture_score"] > 0
    assert report["executive_summary"]["posture_grade"] in ["A", "B", "C", "D"]
    assert report["executive_summary"]["posture_status"] in ["OPTIMAL", "STRONG", "MODERATE", "CRITICAL"]
    assert len(report["executive_summary"]["narrative"]) > 30

    fin = report["financial_risk_quantification"]
    assert fin["expected_annual_loss_inr"] == 3_200_000.0, f"Expected 32 Lakh EAL post-mitigation, got {fin['expected_annual_loss_inr']}"
    assert fin["total_financial_exposure_inr"] == 32_000_000.0, f"Expected 3.2 Cr Exposure post-mitigation, got {fin['total_financial_exposure_inr']}"
    assert fin["value_at_risk_95_inr"] > 0
    assert len(fin["loss_exceedance_scenarios"]) == 3

    inv = report["investment_recommendations"]
    assert inv["portfolio_rosi"] == 268.97, f"Expected 268.97x ROSI post-optimization, got {inv['portfolio_rosi']}"
    assert inv["available_budget_inr"] == 5_000_000.0
    assert len(inv["recommended_controls"]) > 0

    assert len(report["top_risk_drivers"]) > 0
    assert report["compliance_alignment"]["overall_score"] > 0
    assert "NOT AN OFFICIAL STATUTORY AUDIT" in report["report_metadata"]["disclaimer"].upper()
    assert report["blockchain_evidence_hash"] is not None

    print(f"Run {run_num}: Executive Report generated successfully!")
    print(f"  - Report ID: {report['report_metadata']['report_id']}")
    print(f"  - Posture Score: {report['executive_summary']['posture_score']}/100 (Grade {report['executive_summary']['posture_grade']})")
    print(f"  - EAL: ₹{fin['expected_annual_loss_inr']:,.0f}")
    print(f"  - VaR 95%: ₹{fin['value_at_risk_95_inr']:,.0f}")
    print(f"  - Portfolio ROSI: {inv['portfolio_rosi']}x")
    print(f"  - Blockchain Hash: {report['blockchain_evidence_hash'][:24]}...")

    # 5. Generate Security Posture Report
    sp_req = urllib.request.Request("http://127.0.0.1:8000/api/v1/reports/security-posture", headers=auth_headers)
    with urllib.request.urlopen(sp_req) as resp:
        assert resp.status == 200, f"Security posture report failed: HTTP {resp.status}"
        sp_data = json.loads(resp.read().decode("utf-8"))["data"]
    print(f"Run {run_num}: Security Posture Report generated successfully (Monitored Assets: {sp_data['total_monitored_assets']})")
    print(f"=== RUN {run_num} PASSED ===\n")


if __name__ == "__main__":
    print("Testing SIH 26105 End-to-End Demo Sequence...")
    test_full_demo(1)
    test_full_demo(2)
    print(">>> ALL 2 FULL DEMO RUNS PASSED CLEANLY WITH ZERO ERRORS! <<<")
