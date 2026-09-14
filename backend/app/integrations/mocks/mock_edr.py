"""Mock EDR Connector returning realistic synthetic endpoint detections for SIH demo."""

import random
import uuid
from datetime import datetime, timezone
from typing import Any

from app.integrations.connectors.edr import EDRConnector
from app.integrations.normalization import EventSeverity, EventType, NormalizedSecurityEvent


class MockEDRConnector(EDRConnector):
    """Generates synthetic EDR events (CrowdStrike/SentinelOne style) for demonstration."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        super().__init__(is_demo=True, config=config)
        self.connect()

    def fetch_events(self, limit: int = 10) -> list[NormalizedSecurityEvent]:
        events = []
        templates = [
            ("Cobalt Strike beacon process injection", EventType.MALWARE_DETECTED, EventSeverity.CRITICAL, "powershell.exe", "T1055"),
            ("Suspicious mimikatz memory dump detected", EventType.ENDPOINT_ALERT, EventSeverity.HIGH, "lsass.exe", "T1003"),
            ("Ransomware shadow copy deletion command", EventType.MALWARE_DETECTED, EventSeverity.CRITICAL, "vssadmin.exe", "T1490"),
            ("Unsigned binary execution in %APPDATA%", EventType.SUSPICIOUS_ACTIVITY, EventSeverity.MEDIUM, "updater.exe", "T1204"),
        ]

        now = datetime.now(timezone.utc)
        for _ in range(min(limit, 10)):
            desc, event_type, severity, proc, tech = random.choice(templates)
            events.append(
                NormalizedSecurityEvent(
                    source="EDR (Synthetic CrowdStrike)",
                    source_event_id=f"CS-DET-{uuid.uuid4().hex[:8]}",
                    event_type=event_type,
                    timestamp=now,
                    severity=severity,
                    identity_id=f"analyst_{random.randint(1, 3)}@enterprise.internal",
                    ip_address=f"10.0.4.{random.randint(10, 99)}",
                    hostname="payment-gateway-srv.internal",
                    description=desc,
                    normalized_data={
                        "process_name": proc,
                        "mitre_technique": tech,
                        "quarantined": True,
                        "demo_generated": True,
                    },
                    is_demo=True,
                )
            )
        return events
