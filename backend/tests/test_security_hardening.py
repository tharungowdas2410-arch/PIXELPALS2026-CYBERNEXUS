"""Comprehensive Enterprise Security Hardening Test Suite (Phase 12).

Tests:
- Authentication, Password Policy, Argon2id & Brute-Force Lockout
- Centralized RBAC Matrix across all 5 roles (ADMIN, CISO, SECURITY_ANALYST, RISK_MANAGER, EXECUTIVE)
- Multi-Tenancy & IDOR Prevention across Assets, Risks, Incidents, and Audit Logs
- Defense-in-Depth HTTP Security Headers & Request Correlation IDs
- Adaptive Rate Limiting & HTTP 429 Throttling
- Sanitized Error Handling (Zero Information Disclosure)
- Health, Liveness & Readiness Probes
- Append-Only Audit Logging Trail
- User Administration & Password Reset Workflows
- Executive & Compliance Reporting Hub
"""

from datetime import UTC, datetime, timedelta
import json
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    validate_password_policy,
    verify_password,
)
from app.models.enums import UserRole
from tests.conftest import auth_headers


# Helper to register and get headers for a specific role
async def get_role_headers(
    client: AsyncClient,
    role: str,
    email_prefix: str | None = None,
    org_name: str = "Acme Secure Corp",
) -> dict[str, str]:
    prefix = email_prefix or f"user_{role}_{uuid4().hex[:6]}"
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": org_name,
            "industry": "financial_services",
            "country": "IN",
            "email": f"{prefix}@example.com",
            "password": "StrongPassword_2026!",
            "full_name": f"Test {role.title()}",
            "role": role,
        },
    )
    assert res.status_code == 201, f"Failed to register role {role}: {res.text}"
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ============================================================================ #
# 1. Authentication, Password Policy, Argon2id & Brute-Force Lockout
# ============================================================================ #


def test_password_policy_validation_success():
    """Valid strong passwords pass policy without exception."""
    validate_password_policy("StrongPassword_2026!")
    validate_password_policy("Abc12345#")
    validate_password_policy("P@ssw0rd99")


def test_password_policy_validation_rejections():
    """Weak passwords violating policy raise HTTPException."""
    from fastapi import HTTPException

    # Too short (<8 chars)
    with pytest.raises(HTTPException):
        validate_password_policy("Short1!")
    # Missing number and special char
    with pytest.raises(HTTPException):
        validate_password_policy("NoDigitsHere")


def test_argon2id_hashing_and_verification():
    """Password hashing generates valid hash and correctly verifies."""
    pw = "Secret_Password123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_claims_verification():
    """Issued JWT tokens include subject, org, role, iss, aud, and exp claims."""
    uid = uuid4()
    org_id = uuid4()
    token = create_access_token(
        subject=uid,
        organization_id=org_id,
        role="ciso",
        expires_minutes=30,
    )
    decoded = decode_access_token(token)
    assert decoded["sub"] == str(uid)
    assert decoded["org"] == str(org_id)
    assert decoded["role"] == "ciso"
    assert decoded["iss"] == "cybernexus-auth"
    assert decoded["aud"] == "cybernexus-platform"
    assert "exp" in decoded


@pytest.mark.asyncio
async def test_brute_force_lockout_after_five_failed_logins(client: AsyncClient):
    """5 consecutive failed logins lock account; 6th attempt is rejected as locked with 429."""
    email = f"target_lock_{uuid4().hex[:6]}@example.com"
    # Register user
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": "Lockout Corp",
            "industry": "banking",
            "country": "IN",
            "email": email,
            "password": "CorrectPassword_123!",
            "full_name": "Target User",
            "role": "security_analyst",
        },
    )
    assert reg.status_code == 201

    # 5 consecutive bad attempts return 401
    for _ in range(5):
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "WrongPassword_999!"},
        )
        assert res.status_code == 401
        assert "Invalid email or password" in res.text

    # 6th attempt triggers 429 locked out response
    res_6 = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "CorrectPassword_123!"},
    )
    assert res_6.status_code == 429
    assert "locked" in res_6.text.lower() or "excessive" in res_6.text.lower()


@pytest.mark.asyncio
async def test_failed_counter_clears_on_successful_login(client: AsyncClient):
    """Successful login resets the failed login attempt counter."""
    email = f"clean_login_{uuid4().hex[:6]}@example.com"
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": "Clean Corp",
            "industry": "healthcare",
            "country": "IN",
            "email": email,
            "password": "ValidPassword_123!",
            "full_name": "Clean User",
            "role": "risk_manager",
        },
    )
    assert reg.status_code == 201

    # 2 bad attempts
    for _ in range(2):
        await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "BadPassword_1!"},
        )

    # Correct login
    ok = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "ValidPassword_123!"},
    )
    assert ok.status_code == 200
    assert "access_token" in ok.json()["data"]


# ============================================================================ #
# 2. Role-Based Access Control (RBAC) Permissions Matrix
# ============================================================================ #


@pytest.mark.asyncio
async def test_rbac_admin_full_access(client: AsyncClient):
    """ADMIN has access to user management, audit logs, system status, and posture."""
    headers = await get_role_headers(client, "admin")

    users_res = await client.get("/api/v1/users", headers=headers)
    assert users_res.status_code == 200

    audit_res = await client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 200

    posture_res = await client.get("/api/v1/system/security-posture", headers=headers)
    assert posture_res.status_code == 200


@pytest.mark.asyncio
async def test_rbac_ciso_can_access_audit_and_posture_but_not_user_management(client: AsyncClient):
    """CISO can view audit logs and security posture, but is forbidden from user admin (/users)."""
    headers = await get_role_headers(client, "ciso")

    audit_res = await client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 200

    posture_res = await client.get("/api/v1/system/security-posture", headers=headers)
    assert posture_res.status_code == 200

    # User management is restricted to ADMIN only
    users_res = await client.get("/api/v1/users", headers=headers)
    assert users_res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_security_analyst_cannot_access_audit_or_users_or_financial(client: AsyncClient):
    """SECURITY_ANALYST is forbidden from audit logs, user admin, and financial summary."""
    headers = await get_role_headers(client, "security_analyst")

    users_res = await client.get("/api/v1/users", headers=headers)
    assert users_res.status_code == 403

    audit_res = await client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 403

    fin_res = await client.get("/api/v1/financial/summary", headers=headers)
    assert fin_res.status_code == 403

    # But Analyst can access assets and attack paths
    assets_res = await client.get("/api/v1/assets", headers=headers)
    assert assets_res.status_code == 200

    paths_res = await client.get("/api/v1/attack-paths", headers=headers)
    assert paths_res.status_code == 200


@pytest.mark.asyncio
async def test_rbac_risk_manager_can_access_financial_and_optimizer_but_not_users(client: AsyncClient):
    """RISK_MANAGER can view financial risk and run optimizer, but cannot access user management."""
    headers = await get_role_headers(client, "risk_manager")

    users_res = await client.get("/api/v1/users", headers=headers)
    assert users_res.status_code == 403

    fin_res = await client.get("/api/v1/financial/summary", headers=headers)
    assert fin_res.status_code == 200

    inv_res = await client.get("/api/v1/investments", headers=headers)
    assert inv_res.status_code == 200


@pytest.mark.asyncio
async def test_rbac_executive_read_only_access(client: AsyncClient):
    """EXECUTIVE has read access to reports and financial summary, but cannot mutate assets or view audit."""
    headers = await get_role_headers(client, "executive")

    fin_res = await client.get("/api/v1/financial/summary", headers=headers)
    assert fin_res.status_code == 200

    rep_res = await client.get("/api/v1/reports/executive", headers=headers)
    assert rep_res.status_code == 200

    # Executive cannot mutate assets
    mut_res = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={
            "name": "Exec Rogue Asset",
            "asset_type": "server",
            "owner": "Exec",
            "environment": "prod",
            "criticality": 3,
            "business_value": 1000000,
            "exposure": "internal",
        },
    )
    assert mut_res.status_code == 403

    # Executive cannot view audit log
    audit_res = await client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(client: AsyncClient):
    """Unauthenticated request to protected endpoint returns 401."""
    res = await client.get("/api/v1/assets")
    assert res.status_code == 401


# ============================================================================ #
# 3. Multi-Tenancy & IDOR Prevention
# ============================================================================ #


@pytest.mark.asyncio
async def test_asset_cross_tenant_probe_returns_404_not_403(client: AsyncClient):
    """Probing an asset belonging to another organization returns 404 (preventing IDOR enumeration)."""
    headers_org_a = await get_role_headers(client, "admin", "admin_org_a", "Org Alpha")
    headers_org_b = await get_role_headers(client, "admin", "admin_org_b", "Org Beta")

    # Create asset in Org A
    created = await client.post(
        "/api/v1/assets",
        headers=headers_org_a,
        json={
            "name": "Confidential Database",
            "asset_type": "database",
            "owner": "Finance",
            "environment": "production",
            "criticality": 5,
            "business_value": 50000000,
            "exposure": "internal",
        },
    )
    assert created.status_code == 201
    asset_id = created.json()["data"]["id"]

    # Org B attempts to read Org A's asset
    probe = await client.get(f"/api/v1/assets/{asset_id}", headers=headers_org_b)
    assert probe.status_code == 404
    assert "not found" in probe.text.lower()


@pytest.mark.asyncio
async def test_asset_cross_tenant_update_returns_404(client: AsyncClient):
    """Org B attempting to update Org A's asset returns 404."""
    headers_org_a = await get_role_headers(client, "ciso", "ciso_org_a", "Org Alpha 2")
    headers_org_b = await get_role_headers(client, "ciso", "ciso_org_b", "Org Beta 2")

    created = await client.post(
        "/api/v1/assets",
        headers=headers_org_a,
        json={
            "name": "Payment Gateway Alpha",
            "asset_type": "application",
            "owner": "Payments",
            "environment": "production",
            "criticality": 5,
            "business_value": 30000000,
            "exposure": "internet",
        },
    )
    assert created.status_code == 201
    asset_id = created.json()["data"]["id"]

    # Org B attempts to modify
    tamper = await client.put(
        f"/api/v1/assets/{asset_id}",
        headers=headers_org_b,
        json={"owner": "Attacker Hijack"},
    )
    assert tamper.status_code == 404


@pytest.mark.asyncio
async def test_asset_cross_tenant_delete_returns_404(client: AsyncClient):
    """Org B attempting to delete Org A's asset returns 404."""
    headers_org_a = await get_role_headers(client, "admin", "admin_del_a", "Org Alpha 3")
    headers_org_b = await get_role_headers(client, "admin", "admin_del_b", "Org Beta 3")

    created = await client.post(
        "/api/v1/assets",
        headers=headers_org_a,
        json={
            "name": "Key Vault Server",
            "asset_type": "server",
            "owner": "SecOps",
            "environment": "production",
            "criticality": 5,
            "business_value": 20000000,
            "exposure": "isolated",
        },
    )
    assert created.status_code == 201
    asset_id = created.json()["data"]["id"]

    # Org B attempts to delete
    del_res = await client.delete(f"/api/v1/assets/{asset_id}", headers=headers_org_b)
    assert del_res.status_code == 404

    # Confirm asset still exists in Org A
    verify = await client.get(f"/api/v1/assets/{asset_id}", headers=headers_org_a)
    assert verify.status_code == 200


@pytest.mark.asyncio
async def test_incident_cross_tenant_isolation(client: AsyncClient):
    """Org B attempting to view Org A's incident returns 404."""
    headers_org_a = await get_role_headers(client, "ciso", "ciso_inc_a", "Org Alpha Inc")
    headers_org_b = await get_role_headers(client, "ciso", "ciso_inc_b", "Org Beta Inc")

    created = await client.post(
        "/api/v1/incidents",
        headers=headers_org_a,
        json={"title": "Data Breach Probe", "severity": "critical"},
    )
    assert created.status_code == 201
    inc_id = created.json()["data"]["id"]

    probe = await client.get(f"/api/v1/incidents/{inc_id}", headers=headers_org_b)
    assert probe.status_code == 404


@pytest.mark.asyncio
async def test_audit_logs_strictly_tenant_isolated(client: AsyncClient):
    """Audit logs returned to Org B never contain records created by Org A."""
    headers_org_a = await get_role_headers(client, "admin", "audit_a", "Org Audit A")
    headers_org_b = await get_role_headers(client, "admin", "audit_b", "Org Audit B")

    # Create asset in Org A to trigger an audit record
    await client.post(
        "/api/v1/assets",
        headers=headers_org_a,
        json={
            "name": "Org A Distinctive Asset",
            "asset_type": "server",
            "owner": "Alpha",
            "environment": "prod",
            "criticality": 4,
            "business_value": 1000000,
            "exposure": "internal",
        },
    )

    # Query Org B's audit logs
    b_logs = await client.get("/api/v1/audit", headers=headers_org_b)
    assert b_logs.status_code == 200
    entries = b_logs.json()["data"]

    for entry in entries:
        assert "Org A Distinctive Asset" not in json.dumps(entry.get("details", {}))


# ============================================================================ #
# 4. Defense-in-Depth HTTP Security Headers & Correlation IDs
# ============================================================================ #


@pytest.mark.asyncio
async def test_defense_in_depth_security_headers_present(client: AsyncClient):
    """Every API response includes required defense-in-depth security headers."""
    res = await client.get("/health/live")
    assert res.status_code == 200

    headers = res.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "geolocation=()" in headers.get("Permissions-Policy", "")


@pytest.mark.asyncio
async def test_content_security_policy_header_present_on_api(client: AsyncClient):
    """Content-Security-Policy header is attached to API responses."""
    res = await client.get("/health/live")
    assert "Content-Security-Policy" in res.headers
    assert "default-src 'self'" in res.headers["Content-Security-Policy"]


@pytest.mark.asyncio
async def test_request_correlation_id_generated_automatically(client: AsyncClient):
    """When client does not send X-Request-ID, middleware automatically injects a UUID."""
    res = await client.get("/health/live")
    assert "X-Request-ID" in res.headers
    corr_id = res.headers["X-Request-ID"]
    assert len(corr_id) >= 16  # Valid UUID format


@pytest.mark.asyncio
async def test_request_correlation_id_propagated_from_client(client: AsyncClient):
    """When client sends X-Request-ID, the exact ID is reflected in the response."""
    custom_id = f"client-corr-{uuid4().hex}"
    res = await client.get("/health/live", headers={"X-Request-ID": custom_id})
    assert res.headers.get("X-Request-ID") == custom_id


# ============================================================================ #
# 5. Adaptive Rate Limiting & Throttling
# ============================================================================ #


@pytest.mark.asyncio
async def test_rate_limiting_enforcement_returns_429(client: AsyncClient):
    """When rate limiting threshold is set to 1 via X-Test-Rate-Limit, 2nd request returns 429."""
    # Request 1 passes
    res_1 = await client.post(
        "/api/v1/auth/login",
        headers={"X-Test-Rate-Limit": "1"},
        json={"email": f"rate_{uuid4().hex[:6]}@test.com", "password": "WrongPassword1!"},
    )
    assert res_1.status_code == 401

    # Request 2 triggers 429
    res_2 = await client.post(
        "/api/v1/auth/login",
        headers={"X-Test-Rate-Limit": "1"},
        json={"email": f"rate_{uuid4().hex[:6]}@test.com", "password": "WrongPassword1!"},
    )
    assert res_2.status_code == 429
    assert "Retry-After" in res_2.headers
    assert res_2.json()["error"]["code"] == "rate_limit_exceeded"


@pytest.mark.asyncio
async def test_health_endpoints_exempt_from_rate_limiting(client: AsyncClient):
    """Health and liveness probes are never throttled by rate limiting."""
    for _ in range(25):
        res = await client.get("/health/live", headers={"X-Test-Rate-Limit": "true"})
        assert res.status_code == 200


# ============================================================================ #
# 6. Centralized Error Handling & Zero Stack Leakage
# ============================================================================ #


@pytest.mark.asyncio
async def test_not_found_standard_error_format(client: AsyncClient):
    """404 responses conform to standard { error: { code, message, request_id } } schema."""
    headers = await get_role_headers(client, "ciso")
    res = await client.get(f"/api/v1/assets/{uuid4()}", headers=headers)
    assert res.status_code == 404
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "not_found"
    assert "request_id" in data["error"]


@pytest.mark.asyncio
async def test_no_stack_trace_leakage_on_bad_routes(client: AsyncClient):
    """Nonexistent routes return sanitized 404 without internal server traces."""
    res = await client.get("/api/v1/nonexistent-endpoint-random")
    assert res.status_code == 404
    body = res.text
    assert "Traceback (most recent call last)" not in body
    assert "site-packages" not in body


# ============================================================================ #
# 7. Health, Liveness & Readiness Probes
# ============================================================================ #


@pytest.mark.asyncio
async def test_health_live_probe(client: AsyncClient):
    """Liveness probe confirms basic service execution."""
    res = await client.get("/health/live")
    assert res.status_code == 200
    assert res.json()["status"] == "alive"


@pytest.mark.asyncio
async def test_health_ready_probe(client: AsyncClient):
    """Readiness probe verifies database readiness."""
    res = await client.get("/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["checks"]["database"]["status"] == "HEALTHY"


@pytest.mark.asyncio
async def test_system_status_endpoint(client: AsyncClient):
    """System status endpoint exposes zero-trust baseline configuration."""
    headers = await get_role_headers(client, "ciso")
    res = await client.get("/api/v1/system/status", headers=headers)
    assert res.status_code == 200
    body = res.json()["data"]
    assert body["overall_status"] == "HEALTHY"
    assert len(body["components"]) >= 4


@pytest.mark.asyncio
async def test_security_posture_endpoint_returns_eight_domains(client: AsyncClient):
    """Security posture endpoint calculates scores across all 8 enterprise domains."""
    headers = await get_role_headers(client, "ciso")
    res = await client.get("/api/v1/system/security-posture", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert 0.0 <= data["overall_posture_score"] <= 100.0
    assert "posture_level" in data
    domains = data["domains"]
    assert len(domains) == 8
    for d in domains:
        assert 0.0 <= d["score"] <= 100.0
        assert "domain" in d


# ============================================================================ #
# 8. Append-Only Audit Logging Operations
# ============================================================================ #


@pytest.mark.asyncio
async def test_audit_log_created_on_asset_creation(client: AsyncClient):
    """Creating an asset generates an append-only audit trail record."""
    headers = await get_role_headers(client, "admin", "audit_asset_test")

    create_res = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={
            "name": "Audit Tracked Cluster",
            "asset_type": "server",
            "owner": "CloudOps",
            "environment": "production",
            "criticality": 5,
            "business_value": 45000000,
            "exposure": "internal",
        },
    )
    assert create_res.status_code == 201
    asset_id = create_res.json()["data"]["id"]

    # Verify audit log recorded the action
    audit_res = await client.get("/api/v1/audit?action=ASSET_CREATE", headers=headers)
    assert audit_res.status_code == 200
    items = audit_res.json()["data"]
    match = next((item for item in items if item["entity_id"] == asset_id), None)
    assert match is not None
    assert match["action"] == "ASSET_CREATE"
    assert match["result"] == "SUCCESS"
    assert match["entity_type"] == "ASSET"


@pytest.mark.asyncio
async def test_audit_log_created_on_investment_optimization(client: AsyncClient):
    """Running investment optimization records an audit entry with decision details."""
    headers = await get_role_headers(client, "ciso", "audit_opt_test")

    opt_res = await client.post(
        "/api/v1/investments/optimize",
        headers=headers,
        json={
            "budget": 5000000,
            "baseline_risk": 75.0,
            "objective": "BALANCED",
        },
    )
    assert opt_res.status_code == 200

    audit_res = await client.get("/api/v1/audit?action=OPTIMIZE_INVESTMENTS", headers=headers)
    assert audit_res.status_code == 200
    assert len(audit_res.json()["data"]) >= 1


# ============================================================================ #
# 9. User Administration Workflows
# ============================================================================ #


@pytest.mark.asyncio
async def test_admin_user_lifecycle_crud(client: AsyncClient):
    """Admin provisions a user, updates their role, suspends them, and resets password."""
    admin_headers = await get_role_headers(client, "admin", "admin_mgr")

    # 1. Create User
    new_email = f"managed_user_{uuid4().hex[:6]}@example.com"
    create_res = await client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": new_email,
            "full_name": "Managed Analyst",
            "password": "InitialPassword_1!",
            "role": "security_analyst",
        },
    )
    assert create_res.status_code == 201
    user_data = create_res.json()["data"]
    target_id = user_data["id"]
    assert user_data["email"] == new_email
    assert user_data["role"] == "security_analyst"

    # 2. Update Role to Risk Manager
    update_res = await client.patch(
        f"/api/v1/users/{target_id}",
        headers=admin_headers,
        json={"role": "risk_manager"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["role"] == "risk_manager"

    # 3. Suspend User (is_active = False)
    suspend_res = await client.patch(
        f"/api/v1/users/{target_id}",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert suspend_res.status_code == 200
    assert suspend_res.json()["data"]["is_active"] is False

    # Suspended user cannot log in
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": new_email, "password": "InitialPassword_1!"},
    )
    assert login_res.status_code == 403

    # 4. Admin Resets Password
    reset_res = await client.post(
        f"/api/v1/users/{target_id}/reset-password",
        headers=admin_headers,
        json={"new_password": "NewResetPassword_2026!"},
    )
    assert reset_res.status_code == 200

    # Reactivate user and verify new password
    await client.patch(f"/api/v1/users/{target_id}", headers=admin_headers, json={"is_active": True})
    login_ok = await client.post(
        "/api/v1/auth/login",
        json={"email": new_email, "password": "NewResetPassword_2026!"},
    )
    assert login_ok.status_code == 200


# ============================================================================ #
# 10. Executive & Compliance Reporting Hub
# ============================================================================ #


@pytest.mark.asyncio
async def test_executive_report_generation(client: AsyncClient):
    """Executive report aggregates posture, financial risk, compliance, and investments."""
    headers = await get_role_headers(client, "ciso", "exec_rep_test")

    res = await client.get("/api/v1/reports/executive", headers=headers)
    assert res.status_code == 200
    report = res.json()["data"]

    assert "title" in report
    assert "executive_summary" in report
    assert "mean_risk_score" in report
    assert "total_financial_exposure_inr" in report
    assert "expected_annual_loss_inr" in report
    assert "key_investment_recommendations" in report
    assert "strategic_next_actions" in report

    # Verify statutory disclaimer
    assert "disclaimer" in report
    assert "NOT AN OFFICIAL STATUTORY AUDIT" in report["disclaimer"].upper()
