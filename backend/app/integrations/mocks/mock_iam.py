"""Mock IAM Connector returning realistic synthetic identity telemetry for SIH demo."""

import random
import uuid
from datetime import datetime, timezone
from typing import Any

from app.integrations.connectors.iam import IAMConnector
from app.integrations.normalization import EventSeverity, EventType, NormalizedSecurityEvent


class MockIAMConnector(IAMConnector):
    """Generates synthetic IAM events (Okta/Entra ID style) for demonstration."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        super().__init__(is_demo=True, config=config)
        self.connect()

    def fetch_events(self, limit: int = 10) -> list[NormalizedSecurityEvent]:
        events = []
        templates = [
            ("MFA deactivated for privileged domain administrator", EventType.MFA_DISABLED, EventSeverity.HIGH, True),
            ("Impossible travel: login from Lagos after London (12 min)", EventType.SUSPICIOUS_ACTIVITY, EventSeverity.HIGH, False),
            ("Multiple failed auth attempts on single privileged account", EventType.AUTH_FAILURE, EventSeverity.MEDIUM, True),
            ("Dormant privileged user account reactivated", EventType.PRIVILEGED_LOGIN, EventSeverity.HIGH, True),
        ]

        now = datetime.now(timezone.utc)
        for _ in range(min(limit, 10)):
            desc, event_type, severity, priv = random.choice(templates)
            events.append(
                NormalizedSecurityEvent(
                    source="IAM (Synthetic Okta)",
                    source_event_id=f"OKTA-EVT-{uuid.uuid4().hex[:8]}",
                    event_type=event_type,
                    timestamp=now,
                    severity=severity,
                    identity_id="ciso_admin@enterprise.internal" if priv else f"user_{random.randint(10, 99)}@enterprise.internal",
                    ip_address=f"198.51.100.{random.randint(10, 200)}",
                    hostname="idp.enterprise.internal",
                    description=desc,
                    normalized_data={"is_privileged": priv, "demo_generated": True},
                    is_demo=True,
                )
            )
        return events
