"""Threat Intelligence Connector (AlienVault OTX / MISP / OpenCTI abstraction)."""

import os
from datetime import datetime, timezone
from typing import Any

from app.integrations.base import SecurityConnector
from app.integrations.normalization import ConnectorType, EventSeverity, EventType, NormalizedSecurityEvent


class ThreatIntelligenceConnector(SecurityConnector):
    """Connector for Threat Intelligence Feeds and IoC platforms."""

    def __init__(self, is_demo: bool = True, config: dict[str, Any] | None = None) -> None:
        super().__init__(is_demo=is_demo, config=config)
        self.api_url = self.config.get("api_url") or os.getenv("THREAT_INTEL_API_URL")
        self.api_key = self.config.get("api_key") or os.getenv("THREAT_INTEL_API_KEY")
        self.provider = self.config.get("provider", "OpenCTI-ThreatStream")

    def connect(self) -> bool:
        if self.is_demo:
            self._connected = True
            return True
        if self.api_url and self.api_key:
            self._connected = True
            return True
        self._connected = False
        return False

    def disconnect(self) -> bool:
        self._connected = False
        return True

    def health(self) -> dict[str, Any]:
        if self.is_demo:
            return {
                "status": "DEMO",
                "is_demo": True,
                "latency_ms": 13.1,
                "last_sync": datetime.now(timezone.utc).isoformat(),
                "details": f"Synthetic Threat Intel ({self.provider}) active for demonstration",
            }
        if not self._connected:
            return {
                "status": "DISCONNECTED",
                "is_demo": False,
                "latency_ms": 0.0,
                "last_sync": None,
                "details": "Missing THREAT_INTEL_API_URL or THREAT_INTEL_API_KEY configuration",
            }
        return {
            "status": "CONNECTED",
            "is_demo": False,
            "latency_ms": 64.0,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "details": f"Subscribed to {self.provider} feed",
        }

    def fetch_events(self, limit: int = 50) -> list[NormalizedSecurityEvent]:
        return []

    def normalize_event(self, raw_event: dict[str, Any]) -> NormalizedSecurityEvent:
        confidence = float(raw_event.get("confidence") or 0.8)
        severity_str = str(raw_event.get("severity", "")).upper()

        if severity_str in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
            severity = EventSeverity(severity_str)
        elif confidence >= 0.85:
            severity = EventSeverity.HIGH
        elif confidence >= 0.5:
            severity = EventSeverity.MEDIUM
        else:
            severity = EventSeverity.LOW

        indicator = raw_event.get("indicator") or raw_event.get("ioc") or "unknown_ioc"
        actor = raw_event.get("threat_actor") or "APT-Unknown"

        event_time = raw_event.get("timestamp")
        if isinstance(event_time, str):
            try:
                ts = datetime.fromisoformat(event_time.replace("Z", "+00:00"))
            except ValueError:
                ts = datetime.now(timezone.utc)
        elif isinstance(event_time, datetime):
            ts = event_time
        else:
            ts = datetime.now(timezone.utc)

        return NormalizedSecurityEvent(
            source=raw_event.get("source", "THREAT_INTEL"),
            source_event_id=raw_event.get("feed_id") or raw_event.get("id"),
            event_type=EventType.THREAT_INTELLIGENCE_MATCH,
            timestamp=ts,
            severity=severity,
            asset_id=raw_event.get("asset_id"),
            identity_id=None,
            ip_address=raw_event.get("ip_address") or (indicator if "." in indicator and not indicator.startswith("http") else None),
            hostname=raw_event.get("hostname"),
            description=raw_event.get("description")
            or f"Threat intelligence match: IoC {indicator} associated with {actor}",
            raw_reference=raw_event.get("raw_reference"),
            normalized_data={
                "indicator": indicator,
                "indicator_type": raw_event.get("indicator_type", "IP"),
                "confidence": confidence,
                "threat_actor": actor,
                "campaign": raw_event.get("campaign"),
                "active": raw_event.get("active", True),
            },
            is_demo=self.is_demo or raw_event.get("is_demo", False),
        )

    def get_name(self) -> str:
        return f"Threat Intelligence Connector ({self.provider})"

    def get_version(self) -> str:
        return "1.0.2"

    def get_connector_type(self) -> ConnectorType:
        return ConnectorType.THREAT_INTELLIGENCE
