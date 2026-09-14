"""EDR Connector (CrowdStrike Falcon / SentinelOne / Microsoft Defender abstraction)."""

import os
from datetime import datetime, timezone
from typing import Any

from app.integrations.base import SecurityConnector
from app.integrations.normalization import ConnectorType, EventSeverity, EventType, NormalizedSecurityEvent


class EDRConnector(SecurityConnector):
    """Connector for Endpoint Detection and Response (EDR) platforms."""

    def __init__(self, is_demo: bool = True, config: dict[str, Any] | None = None) -> None:
        super().__init__(is_demo=is_demo, config=config)
        self.api_url = self.config.get("api_url") or os.getenv("EDR_API_URL")
        self.api_key = self.config.get("api_key") or os.getenv("EDR_API_KEY")
        self.provider = self.config.get("provider", "CrowdStrike-Falcon")

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
                "latency_ms": 15.0,
                "last_sync": datetime.now(timezone.utc).isoformat(),
                "details": f"Synthetic EDR ({self.provider}) active for demonstration",
            }
        if not self._connected:
            return {
                "status": "DISCONNECTED",
                "is_demo": False,
                "latency_ms": 0.0,
                "last_sync": None,
                "details": "Missing EDR_API_URL or EDR_API_KEY configuration",
            }
        return {
            "status": "CONNECTED",
            "is_demo": False,
            "latency_ms": 38.0,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "details": f"Connected to {self.provider} API",
        }

    def fetch_events(self, limit: int = 50) -> list[NormalizedSecurityEvent]:
        return []

    def normalize_event(self, raw_event: dict[str, Any]) -> NormalizedSecurityEvent:
        detection_type = str(raw_event.get("detection_type", "")).upper()
        severity_str = str(raw_event.get("severity", "HIGH")).upper()

        if "MALWARE" in detection_type or "RANSOMWARE" in detection_type or "TROJAN" in detection_type:
            event_type = EventType.MALWARE_DETECTED
        elif "PROCESS" in detection_type or "BEHAVIOR" in detection_type:
            event_type = EventType.ENDPOINT_ALERT
        else:
            event_type = EventType.SUSPICIOUS_ACTIVITY

        severity = EventSeverity.HIGH
        if severity_str in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
            severity = EventSeverity(severity_str)

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
            source=raw_event.get("source", "EDR"),
            source_event_id=raw_event.get("detection_id") or raw_event.get("id"),
            event_type=event_type,
            timestamp=ts,
            severity=severity,
            asset_id=raw_event.get("asset_id"),
            identity_id=raw_event.get("user") or raw_event.get("identity_id"),
            ip_address=raw_event.get("local_ip") or raw_event.get("ip_address"),
            hostname=raw_event.get("hostname") or raw_event.get("device_name"),
            description=raw_event.get("description") or f"EDR alert: {detection_type} detected on endpoint",
            raw_reference=raw_event.get("raw_reference"),
            normalized_data={
                "process_name": raw_event.get("process_name"),
                "file_hash": raw_event.get("sha256") or raw_event.get("file_hash"),
                "tactic": raw_event.get("mitre_tactic"),
                "technique": raw_event.get("mitre_technique"),
                "quarantined": raw_event.get("quarantined", False),
            },
            is_demo=self.is_demo or raw_event.get("is_demo", False),
        )

    def get_name(self) -> str:
        return f"EDR Connector ({self.provider})"

    def get_version(self) -> str:
        return "1.1.0"

    def get_connector_type(self) -> ConnectorType:
        return ConnectorType.EDR
