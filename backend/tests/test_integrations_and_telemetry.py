"""Phase 11: Comprehensive Test Suite for Enterprise Telemetry Ingestion,

Continuous Risk Quantification, Webhooks, Connectors, and SOC Intelligence.
"""

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import time
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.base import SecurityConnector
from app.integrations.connectors.cspm import CSPMConnector
from app.integrations.connectors.edr import EDRConnector
from app.integrations.connectors.iam import IAMConnector
from app.integrations.connectors.siem import SIEMConnector
from app.integrations.connectors.threat_intelligence import ThreatIntelligenceConnector
from app.integrations.connectors.vulnerability import VulnerabilityConnector
from app.integrations.correlation import CorrelationService
from app.integrations.event_processor import EventProcessor
from app.integrations.mocks import (
    MockCSPMConnector,
    MockEDRConnector,
    MockIAMConnector,
    MockSIEMConnector,
    MockThreatIntelligenceConnector,
    MockVulnerabilityConnector,
)
from app.integrations.normalization import ConnectorType, EventSeverity, EventType, NormalizedSecurityEvent
from app.integrations.registry import ConnectorRegistry
from app.integrations.webhook import ReplayProtectionCache, validate_webhook_timestamp, verify_hmac_signature
from app.models.asset import Asset
from app.models.enums import AssetType, RemediationStatus, Severity, UserRole
from app.models.organization import Organization
from app.models.risk import Risk
from app.models.telemetry import RiskAlert, RiskChangeEvent, SecurityEvent, ThreatIndicator
from app.models.user import User
from app.models.vulnerability import Vulnerability
from app.services.ai_advisor.advisor_service import AIAdvisorService
from app.services.ai_advisor.planner import IntentPlanner
from tests.conftest import auth_headers


# --------------------------------------------------------------------------- #
# 1. Connector Interface & Registry Tests
# --------------------------------------------------------------------------- #


def test_security_connector_interface_adherence() -> None:
    siem = SIEMConnector(is_demo=True)
    assert isinstance(siem, SecurityConnector)
    assert siem.connect() is True
    assert siem.get_connector_type() == ConnectorType.SIEM
    assert "SIEM" in siem.get_name()
    assert siem.get_version() != ""
    health = siem.health()
    assert health["status"] == "DEMO"
    assert health["is_demo"] is True
    assert siem.disconnect() is True


def test_connector_registry_registration_and_health() -> None:
    registry = ConnectorRegistry(is_demo=True)
    all_conns = registry.list_connectors()
    assert len(all_conns) >= 6
    assert "siem" in all_conns
    assert "edr" in all_conns
    assert "iam" in all_conns
    assert "cspm" in all_conns
    assert "vulnerability" in all_conns
    assert "threat_intelligence" in all_conns

    health_status = registry.get_health_status()
    assert len(health_status) >= 6
    for key, h in health_status.items():
        assert "status" in h
        assert "latency_ms" in h


# --------------------------------------------------------------------------- #
# 2. Event Normalization Tests Across Connectors
# --------------------------------------------------------------------------- #


def test_siem_event_normalization() -> None:
    connector = SIEMConnector(is_demo=True)
    raw = {
        "action": "AUTH_DENIED",
        "user": "root_admin",
        "src_ip": "192.168.1.50",
        "host": "auth-dc-01",
        "count": 35,
        "message": "Multiple failed Kerberos login attempts",
    }
    event = connector.normalize_event(raw)
    assert event.event_type == EventType.AUTH_FAILURE
    assert event.severity == EventSeverity.HIGH
    assert event.identity_id == "root_admin"
    assert event.ip_address == "192.168.1.50"
    assert event.hostname == "auth-dc-01"


def test_edr_event_normalization() -> None:
    connector = EDRConnector(is_demo=True)
    raw = {
        "detection_type": "MALWARE_EXECUTION",
        "severity": "CRITICAL",
        "process_name": "mimikatz.exe",
        "sha256": "abcdef1234567890",
        "local_ip": "10.0.4.12",
        "hostname": "payment-api-01",
    }
    event = connector.normalize_event(raw)
    assert event.event_type == EventType.MALWARE_DETECTED
    assert event.severity == EventSeverity.CRITICAL
    assert event.normalized_data["process_name"] == "mimikatz.exe"


def test_iam_event_normalization() -> None:
    connector = IAMConnector(is_demo=True)
    raw = {
        "event_type": "MFA_DEACTIVATE_USER",
        "user": "lead_engineer@bank.test",
        "is_privileged": True,
        "client_ip": "198.51.100.22",
    }
    event = connector.normalize_event(raw)
    assert event.event_type == EventType.MFA_DISABLED
    assert event.severity == EventSeverity.HIGH
    assert event.normalized_data["is_privileged"] is True


def test_cspm_event_normalization() -> None:
    connector = CSPMConnector(is_demo=True)
    raw = {
        "finding_type": "S3_BUCKET_PUBLIC_READ",
        "severity": "HIGH",
        "resource_arn": "arn:aws:s3:::customer-records-backup",
    }
    event = connector.normalize_event(raw)
    assert event.event_type == EventType.DATA_EXPOSURE
    assert event.severity == EventSeverity.HIGH
    assert event.raw_reference == "arn:aws:s3:::customer-records-backup"


def test_vulnerability_event_normalization() -> None:
    connector = VulnerabilityConnector(is_demo=True)
    raw = {
        "cve_id": "CVE-2024-3400",
        "cvss_score": 9.8,
        "status": "FOUND",
        "target_host": "vpn-gateway",
    }
    event = connector.normalize_event(raw)
    assert event.event_type == EventType.VULNERABILITY_FOUND
    assert event.severity == EventSeverity.CRITICAL
    assert event.normalized_data["cve_id"] == "CVE-2024-3400"

    raw_remediated = {
        "cve_id": "CVE-2024-3400",
        "cvss_score": 9.8,
        "status": "REMEDIATED",
        "target_host": "vpn-gateway",
    }
    event_rem = connector.normalize_event(raw_remediated)
    assert event_rem.event_type == EventType.VULNERABILITY_REMEDIATED


def test_threat_intel_event_normalization() -> None:
    connector = ThreatIntelligenceConnector(is_demo=True)
    raw = {
        "indicator": "198.51.100.44",
        "threat_actor": "APT29",
        "confidence": 0.92,
        "campaign": "SolarWinds-Evolution",
    }
    event = connector.normalize_event(raw)
    assert event.event_type == EventType.THREAT_INTELLIGENCE_MATCH
    assert event.severity == EventSeverity.HIGH
    assert event.normalized_data["threat_actor"] == "APT29"


# --------------------------------------------------------------------------- #
# 3. Webhook Security: HMAC, Timestamp & Replay Tests
# --------------------------------------------------------------------------- #


def test_webhook_hmac_verification_success() -> None:
    payload = b'{"event": "test", "status": "ok"}'
    secret = "my-secure-webhook-secret-token"
    sig = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

    assert verify_hmac_signature(payload, secret, sig) is True
    assert verify_hmac_signature(payload, secret, f"sha256={sig}") is True


def test_webhook_hmac_verification_failure() -> None:
    payload = b'{"event": "test"}'
    secret = "correct-secret"
    wrong_sig = "0000000000000000000000000000000000000000000000000000000000000000"

    assert verify_hmac_signature(payload, secret, wrong_sig) is False
    assert verify_hmac_signature(payload, secret, None) is False


def test_webhook_timestamp_drift_check() -> None:
    now_epoch = str(int(time.time()))
    # Should not raise
    validate_webhook_timestamp(now_epoch, max_drift_seconds=300)

    # 10 minutes ago should raise
    expired_epoch = str(int(time.time()) - 600)
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        validate_webhook_timestamp(expired_epoch, max_drift_seconds=300)
    assert exc.value.status_code == 400


def test_webhook_replay_protection_cache() -> None:
    cache = ReplayProtectionCache(max_size=100, ttl_seconds=60)
    nonce = "event-nonce-unique-12345"

    assert cache.check_and_add(nonce) is True
    # Replay attempt must fail
    assert cache.check_and_add(nonce) is False


# --------------------------------------------------------------------------- #
# 4. Pipeline & Asset Resolution Tests
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_event_processor_asset_resolution_by_name(session: AsyncSession) -> None:
    org_id = uuid4()
    org = Organization(id=org_id, name="Resolution Bank")
    session.add(org)

    asset = Asset(
        id=uuid4(),
        organization_id=org_id,
        name="Production Payments API Gateway",
        asset_type=AssetType.APPLICATION,
        criticality=5,
        business_value=15_000_000.0,
    )
    session.add(asset)
    await session.commit()

    processor = EventProcessor(session, organization_id=org_id)
    event_data = NormalizedSecurityEvent(
        source="SIEM",
        event_type=EventType.AUTH_FAILURE,
        hostname="payments-api",
        description="Auth burst against payment gateway",
        is_demo=True,
    )
    res = await processor.process_normalized_event(event_data)
    assert res["status"] == "PROCESSED"
    assert res["asset_resolved"] is True
    assert res["asset_id"] == str(asset.id)


@pytest.mark.asyncio
async def test_event_processor_unresolved_asset(session: AsyncSession) -> None:
    org_id = uuid4()
    org = Organization(id=org_id, name="Unresolved Bank")
    session.add(org)
    await session.commit()

    processor = EventProcessor(session, organization_id=org_id)
    event_data = NormalizedSecurityEvent(
        source="EDR",
        event_type=EventType.MALWARE_DETECTED,
        hostname="completely-unknown-rogue-box-99",
        description="Malware alert on rogue device",
        is_demo=False,
    )
    res = await processor.process_normalized_event(event_data)
    assert res["status"] == "PROCESSED"
    assert res["asset_resolved"] is False
    assert res["asset_id"] is None


# --------------------------------------------------------------------------- #
# 5. Vulnerability Lifecycle & Duplicate CVE Prevention
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_vulnerability_creation_and_deduplication(session: AsyncSession) -> None:
    org_id = uuid4()
    org = Organization(id=org_id, name="Vuln Corp")
    session.add(org)

    asset = Asset(
        id=uuid4(),
        organization_id=org_id,
        name="Customer Portal Server",
        asset_type=AssetType.SERVER,
        criticality=4,
        business_value=5_000_000.0,
    )
    session.add(asset)
    await session.commit()

    processor = EventProcessor(session, organization_id=org_id)

    # 1. Ingest initial discovery of CVE-2024-1111
    ev1 = NormalizedSecurityEvent(
        source="Vulnerability Scanner",
        event_type=EventType.VULNERABILITY_FOUND,
        asset_id=asset.id,
        description="Discovery of CVE-2024-1111",
        normalized_data={"cve_id": "CVE-2024-1111", "cvss_score": 7.5},
        is_demo=True,
    )
    await processor.process_normalized_event(ev1)

    # Verify vuln in DB
    vulns = list(
        (await session.scalars(select(Vulnerability).where(Vulnerability.asset_id == asset.id))).all()
    )
    assert len(vulns) == 1
    assert vulns[0].cve_id == "CVE-2024-1111"
    assert vulns[0].cvss_score == 7.5

    # 2. Ingest duplicate CVE event with updated CVSS
    ev2 = NormalizedSecurityEvent(
        source="Vulnerability Scanner",
        event_type=EventType.VULNERABILITY_FOUND,
        asset_id=asset.id,
        description="Updated score for CVE-2024-1111",
        normalized_data={"cve_id": "CVE-2024-1111", "cvss_score": 9.8},
        is_demo=True,
    )
    await processor.process_normalized_event(ev2)

    # Verify no duplicate was created, but score updated
    vulns_after = list(
        (await session.scalars(select(Vulnerability).where(Vulnerability.asset_id == asset.id))).all()
    )
    assert len(vulns_after) == 1
    assert vulns_after[0].cvss_score == 9.8

    # 3. Ingest remediation
    ev_rem = NormalizedSecurityEvent(
        source="Vulnerability Scanner",
        event_type=EventType.VULNERABILITY_REMEDIATED,
        asset_id=asset.id,
        description="Remediation verified for CVE-2024-1111",
        normalized_data={"cve_id": "CVE-2024-1111"},
        is_demo=True,
    )
    await processor.process_normalized_event(ev_rem)
    await session.refresh(vulns_after[0])
    assert vulns_after[0].remediation_status == RemediationStatus.CLOSED


# --------------------------------------------------------------------------- #
# 6. Event Correlation Tests
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_correlation_service_privileged_and_mfa(session: AsyncSession) -> None:
    org_id = uuid4()
    org = Organization(id=org_id, name="Correlation Org")
    session.add(org)

    # Add past failed logins
    past_event = SecurityEvent(
        id=uuid4(),
        organization_id=org_id,
        source="SIEM",
        event_type=EventType.AUTH_FAILURE.value,
        timestamp=datetime.now(timezone.utc) - timedelta(minutes=10),
        severity="HIGH",
        description="Failed auth burst",
        normalized_data={"failed_count": 25},
        processed=True,
    )
    session.add(past_event)
    await session.commit()

    # Now MFA disabled event arrives
    mfa_event = SecurityEvent(
        id=uuid4(),
        organization_id=org_id,
        source="IAM",
        event_type=EventType.MFA_DISABLED.value,
        timestamp=datetime.now(timezone.utc),
        severity="HIGH",
        identity_id="admin_user",
        description="MFA disabled on admin",
        normalized_data={"is_privileged": True},
        processed=False,
    )
    session.add(mfa_event)
    await session.flush()

    corr = await CorrelationService.evaluate_event(session, mfa_event)
    assert corr is not None
    assert corr.is_correlated is True
    assert "MFA" in corr.pattern_name
    assert corr.risk_impact_delta > 10.0


# --------------------------------------------------------------------------- #
# 7. Risk Change, Alert Generation & Financial Recalculation
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_risk_change_event_and_alert_generation(session: AsyncSession) -> None:
    org_id = uuid4()
    org = Organization(id=org_id, name="Shift Test Org")
    session.add(org)

    asset = Asset(
        id=uuid4(),
        organization_id=org_id,
        name="Financial Settlement Switch",
        asset_type=AssetType.APPLICATION,
        criticality=5,
        business_value=20_000_000.0,
    )
    session.add(asset)

    initial_risk = Risk(
        id=uuid4(),
        organization_id=org_id,
        asset_id=asset.id,
        likelihood=0.4,
        impact=0.7,
        risk_score=25.0,
        residual_risk=25.0,
        expected_annual_loss=2_000_000.0,
        financial_exposure=14_000_000.0,
        calculated_at=datetime.now(timezone.utc),
    )
    session.add(initial_risk)
    await session.commit()

    processor = EventProcessor(session, organization_id=org_id)
    crit_event = NormalizedSecurityEvent(
        source="EDR",
        event_type=EventType.MALWARE_DETECTED,
        severity=EventSeverity.CRITICAL,
        asset_id=asset.id,
        description="Cobalt Strike beacon active in memory",
        is_demo=True,
    )
    res = await processor.process_normalized_event(crit_event, notarize_blockchain=True)

    assert res["status"] == "PROCESSED"
    assert res["new_score"] > res["previous_score"]
    assert res["score_delta"] > 0
    assert res["alert_generated"] is True
    assert res["alert_id"] is not None
    assert res["blockchain_notarized"] is True

    # Check alert row
    alert = await session.get(RiskAlert, UUID(res["alert_id"]))
    assert alert is not None
    assert alert.status == "OPEN"
    assert alert.severity == "CRITICAL"


# --------------------------------------------------------------------------- #
# 8. Threat Intelligence Indicator Matching
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_threat_indicator_matching(session: AsyncSession) -> None:
    org_id = uuid4()
    ioc = ThreatIndicator(
        id=uuid4(),
        organization_id=org_id,
        indicator="198.51.100.99",
        indicator_type="IP",
        confidence=0.95,
        threat_actor="Lazarus Group",
        campaign="FinThreat-2026",
        first_seen=datetime.now(timezone.utc),
        last_seen=datetime.now(timezone.utc),
        active=True,
        source="OpenCTI",
    )
    session.add(ioc)
    await session.commit()

    processor = EventProcessor(session, organization_id=org_id)
    event_data = NormalizedSecurityEvent(
        source="SIEM",
        event_type=EventType.AUTH_FAILURE,
        ip_address="198.51.100.99",
        description="Inbound probe from known malicious IP",
        is_demo=True,
    )
    res = await processor.process_normalized_event(event_data)
    assert res["threat_matched"] is True
    assert res["threat_actor"] == "Lazarus Group"


# --------------------------------------------------------------------------- #
# 9. Tenant Isolation
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_tenant_isolation_in_telemetry(session: AsyncSession) -> None:
    org_a = Organization(id=uuid4(), name="Org Alpha")
    org_b = Organization(id=uuid4(), name="Org Beta")
    session.add_all([org_a, org_b])

    asset_b = Asset(
        id=uuid4(),
        organization_id=org_b.id,
        name="Beta Sensitive Vault",
        asset_type=AssetType.DATABASE,
        criticality=5,
    )
    session.add(asset_b)
    await session.commit()

    # Process event under Org Alpha trying to resolve Org Beta asset
    processor_a = EventProcessor(session, organization_id=org_a.id)
    event = NormalizedSecurityEvent(
        source="SIEM",
        event_type=EventType.AUTH_FAILURE,
        asset_id=asset_b.id,
        description="Cross-tenant access attempt",
        is_demo=True,
    )
    res = await processor_a.process_normalized_event(event)
    # Must NOT map to Org Beta's asset
    assert res["asset_id"] != str(asset_b.id)


# --------------------------------------------------------------------------- #
# 10. API Route Tests (Endpoints)
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_api_integrations_health(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    res = await client.get("/api/v1/integrations/health", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "connectors" in data
    assert "siem" in data["connectors"]
    assert "edr" in data["connectors"]
    assert data["notice"] == "DEMO MODE — SYNTHETIC SECURITY TELEMETRY"


@pytest.mark.asyncio
async def test_api_mock_generate_telemetry(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    payload = {"source": "SIEM", "count": 3}
    res = await client.post("/api/v1/integrations/mock/generate", headers=headers, json=payload)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["generated_count"] == 3
    assert "events" in data
    assert len(data["events"]) == 3


@pytest.mark.asyncio
async def test_api_continuous_risk_summary(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    res = await client.get("/api/v1/continuous-risk/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "current_risk" in data
    assert "previous_risk" in data
    assert "risk_delta" in data
    assert "risk_drift_level" in data
    assert "major_drivers" in data


@pytest.mark.asyncio
async def test_api_continuous_risk_drift(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    res = await client.get("/api/v1/continuous-risk/drift", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "points" in data
    assert len(data["points"]) >= 1


@pytest.mark.asyncio
async def test_api_alerts_lifecycle(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    # Generate mock telemetry that triggers alert
    await client.post(
        "/api/v1/integrations/mock/generate",
        headers=headers,
        json={"source": "EDR", "event_type": "MALWARE_DETECTED", "count": 1},
    )

    # Query alerts
    res_list = await client.get("/api/v1/alerts", headers=headers)
    assert res_list.status_code == 200
    alerts = res_list.json()["data"]
    assert len(alerts) >= 1

    target_alert = alerts[0]
    alert_id = target_alert["id"]

    # Patch status to ACKNOWLEDGED
    res_patch = await client.patch(
        f"/api/v1/alerts/{alert_id}",
        headers=headers,
        json={"status": "ACKNOWLEDGED"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["data"]["status"] == "ACKNOWLEDGED"


@pytest.mark.asyncio
async def test_api_iam_and_cspm_signals(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    res_iam = await client.get("/api/v1/integrations/iam/risk-signals", headers=headers)
    assert res_iam.status_code == 200
    assert "mfa_disabled_accounts" in res_iam.json()["data"]

    res_cspm = await client.get("/api/v1/integrations/cspm/risk-signals", headers=headers)
    assert res_cspm.status_code == 200
    assert "public_storage_buckets" in res_cspm.json()["data"]


# --------------------------------------------------------------------------- #
# 11. AI Advisor Telemetry Understanding
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_ai_advisor_telemetry_intent_and_answer(session: AsyncSession) -> None:
    org_id = uuid4()
    org = Organization(id=org_id, name="Advisor Telemetry Bank")
    session.add(org)

    user = User(
        id=uuid4(),
        organization_id=org_id,
        email="ciso@telembank.test",
        password_hash="pw",
        full_name="Chief Risk Officer",
        role=UserRole.CISO,
    )
    session.add(user)
    await session.commit()

    # Test Intent Planner
    planner = IntentPlanner()
    plan = planner.plan("What changed in the last hour and why did risk change?")
    assert plan.intent == "TELEMETRY_AND_RISK_SHIFT"
    assert any(t.tool_name == "get_recent_telemetry_events" for t in plan.tools)
    assert any(t.tool_name == "get_continuous_risk_drift" for t in plan.tools)

    # Test full Advisor ask
    advisor = AIAdvisorService()
    resp = await advisor.ask(
        question="What changed in the last hour?",
        session=session,
        user=user,
    )
    assert "Continuous Cyber Risk Shift" in resp.answer or "telemetry" in resp.answer.lower()
    assert resp.summary != ""
    assert "current_score" in resp.financial_impact or "overall_risk_score" in resp.financial_impact


# --------------------------------------------------------------------------- #
# 12. Additional Mock Connector, Pipeline & API Verification Tests
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_mock_connectors_fetch_and_normalize() -> None:
    connectors = [
        MockSIEMConnector(),
        MockEDRConnector(),
        MockIAMConnector(),
        MockCSPMConnector(),
        MockVulnerabilityConnector(),
        MockThreatIntelligenceConnector(),
    ]
    for conn in connectors:
        events = conn.fetch_events(limit=3)
        assert len(events) >= 1
        for ev in events:
            assert ev.source != ""
            assert ev.description != ""
            assert ev.is_demo is True


@pytest.mark.asyncio
async def test_event_processor_asset_resolution_by_ip(session: AsyncSession) -> None:
    org_id = uuid4()
    org = Organization(id=org_id, name="IP Resolution Bank")
    session.add(org)

    asset = Asset(
        id=uuid4(),
        organization_id=org_id,
        name="Internal Database Cluster (10.100.4.22)",
        description="Core ledger database hosted at 10.100.4.22",
        asset_type=AssetType.DATABASE,
        criticality=4,
    )
    session.add(asset)
    await session.commit()

    processor = EventProcessor(session, organization_id=org_id)
    event_data = NormalizedSecurityEvent(
        source="EDR",
        event_type=EventType.MALWARE_DETECTED,
        ip_address="10.100.4.22",
        description="Cobalt Strike agent beacon on db node",
        is_demo=True,
    )
    res = await processor.process_normalized_event(event_data)
    assert res["status"] == "PROCESSED"
    assert res["asset_resolved"] is True
    assert res["asset_id"] == str(asset.id)


@pytest.mark.asyncio
async def test_correlation_service_weaponized_vulnerability(session: AsyncSession) -> None:
    org_id = uuid4()
    org = Organization(id=org_id, name="Weaponized Vuln Org")
    session.add(org)

    asset = Asset(
        id=uuid4(),
        organization_id=org_id,
        name="Internet Gateway Proxy",
        asset_type=AssetType.SERVER,
        criticality=5,
    )
    session.add(asset)

    # Past vuln event with CVSS >= 9.0
    vuln_event = SecurityEvent(
        id=uuid4(),
        organization_id=org_id,
        asset_id=asset.id,
        source="Vulnerability Scanner",
        event_type=EventType.VULNERABILITY_FOUND.value,
        timestamp=datetime.now(timezone.utc) - timedelta(minutes=15),
        severity="CRITICAL",
        description="Discovered CVE-2024-3400 PAN-OS zero-day",
        normalized_data={"cve_id": "CVE-2024-3400", "cvss_score": 10.0},
        processed=True,
    )
    session.add(vuln_event)
    await session.commit()

    # Now threat intel match arrives
    threat_event = SecurityEvent(
        id=uuid4(),
        organization_id=org_id,
        asset_id=asset.id,
        source="Threat Intel",
        event_type=EventType.THREAT_INTELLIGENCE_MATCH.value,
        timestamp=datetime.now(timezone.utc),
        severity="CRITICAL",
        description="Active exploitation in the wild by UTA0218",
        normalized_data={"threat_actor": "UTA0218", "confidence": 0.95},
        processed=False,
    )
    session.add(threat_event)
    await session.flush()

    corr = await CorrelationService.evaluate_event(session, threat_event)
    assert corr is not None
    assert corr.is_correlated is True
    assert "Weaponized" in corr.pattern_name
    assert corr.risk_impact_delta >= 20.0


@pytest.mark.asyncio
async def test_api_integrations_events_filter(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    res = await client.get("/api/v1/integrations/events?page=1&page_size=10", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    assert "total" in data
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_api_notarize_risk_drift(client: AsyncClient, session: AsyncSession) -> None:
    headers = await auth_headers(client)

    # We can fetch continuous risk summary first to get user's org
    res_sum = await client.get("/api/v1/continuous-risk/summary", headers=headers)
    assert res_sum.status_code == 200

    # Query current test user created by auth_headers
    user_stmt = select(User).where(User.email == "ciso@example.com")
    user = (await session.scalars(user_stmt)).first()
    assert user is not None

    rc = RiskChangeEvent(
        id=uuid4(),
        organization_id=user.organization_id,
        previous_score=72.0,
        new_score=81.0,
        score_delta=9.0,
        previous_eal=5_000_000.0,
        new_eal=10_500_000.0,
        eal_delta=5_500_000.0,
        reason="Material risk jump from CVE-2024-3400 and malware beacon",
        created_at=datetime.now(timezone.utc),
    )
    session.add(rc)
    await session.commit()

    # Call notarize endpoint
    res_notarize = await client.post(f"/api/v1/continuous-risk/{rc.id}/notarize", headers=headers)
    assert res_notarize.status_code == 200
    notarize_data = res_notarize.json()["data"]
    assert notarize_data["status"] in ("RECORDED", "SUCCESS")
    assert "evidence_hash" in notarize_data or "blockchain_evidence_id" in notarize_data


def test_webhook_timestamp_missing_and_invalid() -> None:
    from fastapi import HTTPException

    # Expired timestamp beyond 300s drift should raise 400
    expired = str(int(time.time()) - 1000)
    with pytest.raises(HTTPException) as exc1:
        validate_webhook_timestamp(expired)
    assert exc1.value.status_code == 400

    # Non-timestamp string should raise 400
    with pytest.raises(HTTPException) as exc2:
        validate_webhook_timestamp("not-a-valid-timestamp")
    assert exc2.value.status_code == 400


