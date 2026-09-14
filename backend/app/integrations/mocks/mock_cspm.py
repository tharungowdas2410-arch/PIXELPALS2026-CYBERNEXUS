"""Mock CSPM Connector returning realistic synthetic cloud posture findings for SIH demo."""

import random
import uuid
from datetime import datetime, timezone
from typing import Any

from app.integrations.connectors.cspm import CSPMConnector
from app.integrations.normalization import EventSeverity, EventType, NormalizedSecurityEvent


class MockCSPMConnector(CSPMConnector):
    """Generates synthetic CSPM events (AWS Security Hub / Wiz style) for demonstration."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        super().__init__(is_demo=True, config=config)
        self.connect()

    def fetch_events(self, limit: int = 10) -> list[NormalizedSecurityEvent]:
        events = []
        templates = [
            ("S3 Bucket with sensitive customer PII opened to public read", EventType.DATA_EXPOSURE, EventSeverity.HIGH, "arn:aws:s3:::customer-pii-backup"),
            ("Security group 0.0.0.0/0 ingress open to port 3389 (RDP)", EventType.CLOUD_MISCONFIGURATION, EventSeverity.HIGH, "sg-0982181729"),
            ("RDS PostgreSQL database snapshot unencrypted", EventType.POLICY_VIOLATION, EventSeverity.MEDIUM, "rds:prod-payment-db"),
            ("CloudTrail management logs disabled in secondary region", EventType.POLICY_VIOLATION, EventSeverity.MEDIUM, "trail:global-sec-trail"),
        ]

        now = datetime.now(timezone.utc)
        for _ in range(min(limit, 10)):
            desc, event_type, severity, resource = random.choice(templates)
            events.append(
                NormalizedSecurityEvent(
                    source="CSPM (Synthetic AWS Hub)",
                    source_event_id=f"AWS-SEC-{uuid.uuid4().hex[:8]}",
                    event_type=event_type,
                    timestamp=now,
                    severity=severity,
                    identity_id=None,
                    ip_address=None,
                    hostname=resource,
                    description=desc,
                    raw_reference=resource,
                    normalized_data={
                        "cloud_provider": "AWS",
                        "resource_id": resource,
                        "demo_generated": True,
                    },
                    is_demo=True,
                )
            )
        return events
