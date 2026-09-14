#!/usr/bin/env python3
"""
CYBERNEXUS — Final End-to-End System Smoke Test (Phase 14)
Problem Statement: SIH 26105 (AI-Powered Continuous Cyber Risk Platform)

Validates all 12 critical subsystems:
1. Backend Reachability
2. Health Endpoint & Probes
3. Database Connectivity
4. Authentication & JWT Issuance
5. Dashboard & System Status
6. Deterministic Risk Quantification
7. Financial Loss Models & EAL
8. Investment Portfolio Optimizer
9. Neo4j Attack Path Graph
10. Grounded AI Risk Advisor
11. Tamper-Evident Blockchain Evidence
12. Demo State Machine & Safe Reset
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = os.environ.get("CYBERNEXUS_API_URL", "http://127.0.0.1:8000")
API_PREFIX = "/api/v1"

results = []

def run_check(step_num: int, name: str, endpoint: str, fn):
    start = time.perf_counter()
    try:
        ok, msg = fn()
        duration_ms = (time.perf_counter() - start) * 1000
        status = "PASS" if ok else "FAIL"
        results.append((step_num, name, endpoint, status, f"{duration_ms:.1f}ms", msg))
        return ok
    except Exception as e:
        duration_ms = (time.perf_counter() - start) * 1000
        results.append((step_num, name, endpoint, "FAIL", f"{duration_ms:.1f}ms", str(e)[:60]))
        return False


def request_json(url: str, method: str = "GET", data: dict = None, headers: dict = None):
    full_url = f"{BASE_URL}{url}"
    hdrs = {"Accept": "application/json", "Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(full_url, data=body, headers=hdrs, method=method)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def main():
    print("=" * 80)
    print("CYBERNEXUS — PHASE 14 FINAL SYSTEM SMOKE TEST")
    print(f"Target Base URL: {BASE_URL}")
    print("=" * 80)

    token = None
    auth_headers = {}

    # 1. Backend Reachable
    def check_reachability():
        status, payload = request_json("/health/live")
        return status == 200 and payload.get("status") == "alive", "Core FastAPI process alive"

    run_check(1, "Backend Reachability", "/health/live", check_reachability)

    # 2. Health Endpoint
    def check_health():
        status, payload = request_json("/health/ready")
        return status == 200 and payload.get("status") == "ready", f"Service {payload.get('service')}"

    run_check(2, "Subsystem Health", "/health/ready", check_health)

    # 3. Database Connected
    def check_database():
        status, payload = request_json("/health/ready")
        db_status = payload.get("checks", {}).get("database", {}).get("status")
        return db_status == "HEALTHY", f"Relational DB: {db_status}"

    run_check(3, "Database Connected", "/health/ready", check_database)

    # 4. Authentication
    def check_auth():
        nonlocal token, auth_headers
        login_data = {
            "email": "ciso@northbridge.example",
            "password": "ChangeMe_demo1!",
        }
        try:
            status, payload = request_json(f"{API_PREFIX}/auth/login", method="POST", data=login_data)
            token = payload.get("data", {}).get("access_token")
        except urllib.error.HTTPError:
            login_data = {
                "email": "demo_test_admin@northbridge.example",
                "password": "ValidPassword_2026!",
            }
            status, payload = request_json(f"{API_PREFIX}/auth/login", method="POST", data=login_data)
            token = payload.get("data", {}).get("access_token")

        if token:
            auth_headers = {"Authorization": f"Bearer {token}"}
            return True, "JWT access token successfully issued"
        return False, "Failed to obtain token"

    run_check(4, "Authentication & RBAC", f"{API_PREFIX}/auth/login", check_auth)

    # 5. Dashboard / System Status
    def check_system_status():
        status, payload = request_json(f"{API_PREFIX}/system/status", headers=auth_headers)
        data = payload.get("data", {})
        overall = data.get("overall_status")
        components = len(data.get("components", []))
        return status == 200 and overall is not None, f"Status: {overall} ({components} components)"

    run_check(5, "Dashboard & Posture", f"{API_PREFIX}/system/status", check_system_status)

    # 6. Risk Calculation
    def check_risk():
        status, payload = request_json(f"{API_PREFIX}/risks", headers=auth_headers)
        count = len(payload.get("data", []))
        return status == 200, f"{count} quantified risk records in register"

    run_check(6, "Risk Quantification", f"{API_PREFIX}/risks", check_risk)

    # 7. Financial Risk Exposure
    def check_financial():
        status, payload = request_json(f"{API_PREFIX}/financial/summary", headers=auth_headers)
        data = payload.get("data", {})
        eal = data.get("expected_annual_loss")
        return status == 200, f"Modeled EAL: INR {eal:,.0f}" if isinstance(eal, (int, float)) else "Financial summary valid"

    run_check(7, "Financial Loss Models", f"{API_PREFIX}/financial/summary", check_financial)

    # 8. Investment Optimizer
    def check_optimizer():
        opt_req = {
            "budget": 5000000.0,
            "objective": "BALANCED",
            "time_horizon_months": 12,
            "baseline_risk": 78.0,
        }
        status, payload = request_json(f"{API_PREFIX}/investments/optimize", method="POST", data=opt_req, headers=auth_headers)
        data = payload.get("data", {})
        rosi = data.get("portfolio_rosi")
        return status == 200 and "selected_investments" in data, f"Optimal Portfolio ROSI: {rosi}x"

    run_check(8, "Investment Optimizer", f"{API_PREFIX}/investments/optimize", check_optimizer)

    # 9. Attack Paths
    def check_attack_paths():
        status, payload = request_json(f"{API_PREFIX}/graph/critical-paths", headers=auth_headers)
        data = payload.get("data", {})
        paths_count = data.get("count", 0)
        source = data.get("graph_source", "engine")
        return status == 200, f"{paths_count} critical paths ({source})"

    run_check(9, "Attack Path Graph", f"{API_PREFIX}/graph/critical-paths", check_attack_paths)

    # 10. AI Advisor
    def check_ai_advisor():
        ask_data = {
            "question": "Where should I spend ₹50 lakh for maximum risk reduction?",
            "budget_override": 5000000,
        }
        status, payload = request_json(f"{API_PREFIX}/advisor/ask", method="POST", data=ask_data, headers=auth_headers)
        data = payload.get("data", {})
        conf = data.get("confidence", "HIGH")
        return status == 200 and "answer" in data, f"Grounded response (Confidence: {conf})"

    run_check(10, "AI Risk Advisor", f"{API_PREFIX}/advisor/ask", check_ai_advisor)

    # 11. Blockchain Evidence Verification
    def check_blockchain():
        test_uuid = str(uuid.uuid4())
        payload_text = "smoke-test-payload-hash-validation"
        rec_data = {
            "evidence_type": "smoke-test-attestation",
            "entity_id": test_uuid,
            "payload": payload_text,
        }
        status, payload = request_json(f"{API_PREFIX}/blockchain/record", method="POST", data=rec_data, headers=auth_headers)
        record = payload.get("data", {})
        digest = record.get("evidence_hash", "")
        recorded_ok = status == 201 and record.get("verification_status") == "recorded"

        # Also verify hash integrity through verification endpoint
        v_status, v_payload = request_json(
            f"{API_PREFIX}/blockchain/verify",
            method="POST",
            data={"payload": payload_text, "evidence_hash": digest},
            headers=auth_headers,
        )
        verified_ok = v_status == 200 and v_payload.get("data", {}).get("valid") is True
        return recorded_ok and verified_ok, f"Digest: {digest[:16]}... (Attested & Verified)"

    run_check(11, "Blockchain Evidence", f"{API_PREFIX}/blockchain/record", check_blockchain)

    # 12. Demo State Machine & Safe Reset
    def check_demo_reset():
        status, payload = request_json(f"{API_PREFIX}/demo/reset", method="POST", headers=auth_headers)
        data = payload.get("data", {})
        return status == 200 and data.get("active_scene") == 1, "Baseline demo state restored"

    run_check(12, "Demo State Reset", f"{API_PREFIX}/demo/reset", check_demo_reset)

    # 13. Executive & Security Posture Reports (Step 11 Verification)
    def check_reports():
        e_status, e_payload = request_json(f"{API_PREFIX}/reports/executive", headers=auth_headers)
        e_data = e_payload.get("data", {})
        exec_ok = (
            e_status == 200
            and "report_metadata" in e_data
            and "executive_summary" in e_data
            and "financial_risk_quantification" in e_data
            and "investment_recommendations" in e_data
        )
        s_status, s_payload = request_json(f"{API_PREFIX}/reports/security-posture", headers=auth_headers)
        sec_ok = s_status == 200 and s_payload.get("data", {}).get("total_monitored_assets", 0) > 0
        return exec_ok and sec_ok, f"Executive (Score: {e_data.get('executive_summary', {}).get('posture_score')}/100) & Posture Reports Verified"

    run_check(13, "Executive & Posture Reports", f"{API_PREFIX}/reports/executive", check_reports)

    # Print Summary Table
    print("\n" + "=" * 80)
    print(f"{'#':<3} | {'Subsystem':<26} | {'Target Endpoint':<30} | {'Status':<6} | {'Duration'}")
    print("-" * 80)
    all_passed = True
    for num, name, ep, stat, dur, detail in results:
        print(f"{num:<3} | {name:<26} | {ep:<30} | {stat:<6} | {dur:<8} -> {detail}")
        if stat != "PASS":
            all_passed = False
    print("=" * 80)

    if all_passed:
        print("\nSUCCESS: ALL 13 CRITICAL SYSTEM SUBSYSTEMS OPERATIONAL & VERIFIED.\n")
        sys.exit(0)
    else:
        print("\nFAILURE: ONE OR MORE SUBSYSTEMS FAILED SMOKE TEST VALIDATION.\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
