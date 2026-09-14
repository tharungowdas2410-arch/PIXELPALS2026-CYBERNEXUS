"""Mock Threat Intelligence Connector returning realistic synthetic threat indicators for SIH demo."""

import random
import uuid
from datetime import datetime, timezone
from typing import Any

from app.integrations.connectors.threat_intelligence import ThreatIntelligenceConnector
from app.integrations.normalization import EventSeverity, EventType, NormalizedSecurityEvent


class MockThreatIntelligenceConnector(ThreatIntelligenceConnector):
    """Generates synthetic Threat Intelligence alerts (OpenCTI/MISP style) for demonstration."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        super().__init__(is_demo=True, config=config)
        self.connect()

    def fetch_events(self, limit: int = 10) -> list[NormalizedSecurityEvent]:
        events = []
        templates = [
            ("198.51.100.44", "IP", "APT29 (Cozy Bear)", "SolarWinds-Followup", 0.94, EventSeverity.CRITICAL),
            ("c2-malicious-node.xyz", "DOMAIN", "Lazarus Group", "CryptoHeist-2026", 0.88, EventSeverity.HIGH),
            ("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "HASH", "LockBit 3.0", "RansomOps", 0.91, EventSeverity.CRITICAL),
            ("203.0.113.88", "IP", "Volt Typhoon", "Critical-Infra-Infiltration", 0.85, EventSeverity.HIGH),
        ]

        now = datetime.now(timezone.utc)
        for _ in range(min(limit, 10)):
            ioc, ioc_type, actor, campaign, conf, severity = random.choice(templates)
            events.append(
                NormalizedSecurityEvent(
                    source="Threat Intelligence (Synthetic OpenCTI)",
                    source_event_id=f"OPENCTI-IOC-{uuid.uuid4().hex[:8]}",
                    event_type=EventType.THREAT_INTELLIGENCE_MATCH,
                    timestamp=now,
                    severity=severity,
                    identity_id=None,
                    ip_address=ioc if ioc_type == "IP" else "10.0.4.15",
                    hostname="payment-gateway-srv.internal",
                    description=f"Active C2 / IoC match: {ioc} linked to {actor} ({campaign})",
                    normalized_data={
                        "indicator": ioc,
                        "indicator_type": ioc_type,
                        "threat_actor": actor,
                        "campaign": campaign,
                        "confidence": conf,
                        "demo_generated": True,
                    },
                    is_demo=True,
                )
            )
        return events
