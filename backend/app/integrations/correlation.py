"""Explainable Event Correlation Service for detecting compound attack chains."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.normalization import EventType
from app.models.telemetry import SecurityEvent


@dataclass
class CorrelationResult:
    """Explainable result of multi-source telemetry correlation."""

    is_correlated: bool
    pattern_name: str
    reason: str
    affected_asset_id: UUID | None
    risk_impact_delta: float
    confidence: float
    correlated_event_ids: list[UUID] = field(default_factory=list)
    mitre_tactic: str | None = None


class CorrelationService:
    """Analyzes recent telemetry events across connectors to identify compound attack patterns."""

    @staticmethod
    async def evaluate_event(
        db: AsyncSession,
        event: SecurityEvent,
        window_minutes: int = 60,
    ) -> CorrelationResult | None:
        """Examine whether the incoming event completes or triggers a known correlation pattern."""
        since = event.timestamp - timedelta(minutes=window_minutes)

        # Query recent events for the same organization
        stmt = (
            select(SecurityEvent)
            .where(
                SecurityEvent.organization_id == event.organization_id,
                SecurityEvent.timestamp >= since,
                SecurityEvent.id != event.id,
            )
            .order_by(SecurityEvent.timestamp.desc())
            .limit(50)
        )
        res = await db.execute(stmt)
        recent_events = list(res.scalars().all())

        all_events = [event] + recent_events

        # Pattern 1: Credential Stuffing / Brute Force + MFA Deactivation on Privileged Account
        mfa_events = [e for e in all_events if e.event_type == EventType.MFA_DISABLED.value]
        auth_failures = [e for e in all_events if e.event_type == EventType.AUTH_FAILURE.value]
        priv_events = [
            e
            for e in all_events
            if e.event_type == EventType.PRIVILEGED_LOGIN.value
            or (e.normalized_data and e.normalized_data.get("is_privileged"))
        ]

        failed_count = sum((e.normalized_data or {}).get("failed_count", 1) for e in auth_failures)

        if mfa_events and (failed_count >= 10 or priv_events):
            correlated_ids = [e.id for e in mfa_events + auth_failures[:5] + priv_events[:2]]
            return CorrelationResult(
                is_correlated=True,
                pattern_name="Compromised Privileged Identity & MFA Bypass",
                reason=(
                    f"Detected {failed_count} authentication failures followed by MFA deactivation "
                    f"on privileged account ({mfa_events[0].identity_id or 'admin'}). High probability of account takeover."
                ),
                affected_asset_id=event.asset_id or mfa_events[0].asset_id,
                risk_impact_delta=18.0,
                confidence=0.92,
                correlated_event_ids=correlated_ids,
                mitre_tactic="Credential Access / Defense Evasion",
            )

        # Pattern 2: Critical Vulnerability Found + Threat Intel IoC Active Match
        vuln_events = [
            e
            for e in all_events
            if e.event_type == EventType.VULNERABILITY_FOUND.value
            and (e.severity == "CRITICAL" or (e.normalized_data or {}).get("cvss_score", 0) >= 9.0)
        ]
        threat_events = [e for e in all_events if e.event_type == EventType.THREAT_INTELLIGENCE_MATCH.value]

        if vuln_events and threat_events:
            matching_asset = event.asset_id or vuln_events[0].asset_id
            cve_id = (vuln_events[0].normalized_data or {}).get("cve_id", "Critical CVE")
            actor = (threat_events[0].normalized_data or {}).get("threat_actor", "Threat Actor")
            correlated_ids = [vuln_events[0].id, threat_events[0].id]

            return CorrelationResult(
                is_correlated=True,
                pattern_name="Weaponized Vulnerability with Active Threat Activity",
                reason=(
                    f"Critical unpatched vulnerability ({cve_id}) coincides with active IoC match "
                    f"associated with {actor}. Direct exploitation threat imminent."
                ),
                affected_asset_id=matching_asset,
                risk_impact_delta=22.0,
                confidence=0.95,
                correlated_event_ids=correlated_ids,
                mitre_tactic="Initial Access / Exploitation",
            )

        # Pattern 3: Cloud Misconfiguration + Public Data Exposure + Suspicious Traffic
        cspm_events = [e for e in all_events if e.event_type == EventType.CLOUD_MISCONFIGURATION.value]
        exposure_events = [e for e in all_events if e.event_type == EventType.DATA_EXPOSURE.value]
        network_alerts = [e for e in all_events if e.event_type == EventType.NETWORK_ALERT.value]

        if (cspm_events or exposure_events) and network_alerts:
            correlated_ids = [e.id for e in (cspm_events + exposure_events + network_alerts)[:4]]
            return CorrelationResult(
                is_correlated=True,
                pattern_name="Cloud Exposure Under Active Reconnaissance",
                reason=(
                    "Publicly exposed cloud resource or permissive security group is receiving active "
                    "external reconnaissance probes."
                ),
                affected_asset_id=event.asset_id or (cspm_events[0].asset_id if cspm_events else None),
                risk_impact_delta=14.0,
                confidence=0.86,
                correlated_event_ids=correlated_ids,
                mitre_tactic="Discovery / Exfiltration",
            )

        # Pattern 4: EDR Detection + Unauthorized Privileged Command
        edr_events = [e for e in all_events if e.event_type in (EventType.MALWARE_DETECTED.value, EventType.ENDPOINT_ALERT.value)]
        if edr_events and priv_events:
            correlated_ids = [edr_events[0].id, priv_events[0].id]
            return CorrelationResult(
                is_correlated=True,
                pattern_name="Lateral Movement & Malicious Execution",
                reason="Privileged authentication coincident with endpoint malware detection indicates lateral movement in progress.",
                affected_asset_id=event.asset_id or edr_events[0].asset_id,
                risk_impact_delta=20.0,
                confidence=0.91,
                correlated_event_ids=correlated_ids,
                mitre_tactic="Lateral Movement / Execution",
            )

        return None
