"""Mock SIEM Connector returning realistic synthetic telemetry for SIH demo."""

import random
import uuid
from datetime import datetime, timezone
from typing import Any

from app.integrations.connectors.siem import SIEMConnector
from app.integrations.normalization import EventSeverity, EventType, NormalizedSecurityEvent


class MockSIEMConnector(SIEMConnector):
    """Generates synthetic SIEM events (Splunk/Sentinel style) for demonstration."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        super().__init__(is_demo=True, config=config)
        self.connect()

    def fetch_events(self, limit: int = 10) -> list[NormalizedSecurityEvent]:
        events = []
        templates = [
            ("Failed login burst (brute force attempt)", EventType.AUTH_FAILURE, EventSeverity.HIGH, 45),
            ("Privileged root escalation via sudo", EventType.PRIVILEGED_LOGIN, EventSeverity.MEDIUM, 1),
            ("Port sweep from internal host", EventType.NETWORK_ALERT, EventSeverity.LOW, 1),
            ("Successful admin login from corporate VPN", EventType.AUTH_SUCCESS, EventSeverity.INFO, 1),
        ]

        now = datetime.now(timezone.utc)
        for i in range(min(limit, 10)):
            desc, event_type, severity, count = random.choice(templates)
            events.append(
                NormalizedSecurityEvent(
                    source="SIEM (Synthetic Splunk)",
                    source_event_id=f"SPLUNK-EVT-{uuid.uuid4().hex[:8]}",
                    event_type=event_type,
                    timestamp=now,
                    severity=severity,
                    identity_id=f"admin_user_{random.randint(1, 5)}@enterprise.internal",
                    ip_address=f"192.168.1.{random.randint(20, 200)}",
                    hostname="auth-srv-01.internal",
                    description=desc,
                    normalized_data={"failed_count": count, "demo_generated": True},
                    is_demo=True,
                )
            )
        return events
