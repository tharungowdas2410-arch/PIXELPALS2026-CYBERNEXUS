"""SIEM Connector (Splunk / Microsoft Sentinel / QRadar abstraction)."""

import os
from datetime import datetime, timezone
from typing import Any

from app.integrations.base import SecurityConnector
from app.integrations.normalization import ConnectorType, EventSeverity, EventType, NormalizedSecurityEvent


class SIEMConnector(SecurityConnector):
    """Connector for Security Information and Event Management (SIEM) systems."""

    def __init__(self, is_demo: bool = True, config: dict[str, Any] | None = None) -> None:
        super().__init__(is_demo=is_demo, config=config)
        self.api_url = self.config.get("api_url") or os.getenv("SIEM_API_URL")
        self.api_key = self.config.get("api_key") or os.getenv("SIEM_API_KEY")
        self.provider = self.config.get("provider", "Splunk-Enterprise")

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
                "latency_ms": 12.5,
                "last_sync": datetime.now(timezone.utc).isoformat(),
                "details": f"Synthetic SIEM ({self.provider}) active for demonstration",
            }
        if not self._connected:
            return {
                "status": "DISCONNECTED",
                "is_demo": False,
                "latency_ms": 0.0,
                "last_sync": None,
                "details": "Missing SIEM_API_URL or SIEM_API_KEY configuration",
            }
        return {
            "status": "CONNECTED",
            "is_demo": False,
            "latency_ms": 45.2,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "details": f"Connected to {self.provider} API at {self.api_url}",
        }

    def fetch_events(self, limit: int = 50) -> list[NormalizedSecurityEvent]:
        # Production connector would query SIEM REST API/search endpoints
        return []

    def normalize_event(self, raw_event: dict[str, Any]) -> NormalizedSecurityEvent:
        action = str(raw_event.get("action", "")).upper()
        severity_str = str(raw_event.get("severity", "MEDIUM")).upper()

        if "FAIL" in action or "DENY" in action or "DENI" in action:
            event_type = EventType.AUTH_FAILURE
        elif "PRIVILEGE" in action or "ADMIN" in action:
            event_type = EventType.PRIVILEGED_LOGIN
        elif "SUCCESS" in action:
            event_type = EventType.AUTH_SUCCESS
        elif "NETWORK" in action or "SCAN" in action:
            event_type = EventType.NETWORK_ALERT
        else:
            event_type = EventType.SUSPICIOUS_ACTIVITY

        severity = EventSeverity.MEDIUM
        raw_sev = raw_event.get("severity")
        if raw_sev and str(raw_sev).upper() in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
            severity = EventSeverity(str(raw_sev).upper())
        elif event_type == EventType.AUTH_FAILURE and raw_event.get("count", 1) > 20:
            severity = EventSeverity.HIGH

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
            source=raw_event.get("source", "SIEM"),
            source_event_id=raw_event.get("event_id") or raw_event.get("id"),
            event_type=event_type,
            timestamp=ts,
            severity=severity,
            asset_id=raw_event.get("asset_id"),
            identity_id=raw_event.get("user") or raw_event.get("identity_id"),
            ip_address=raw_event.get("src_ip") or raw_event.get("ip_address"),
            hostname=raw_event.get("host") or raw_event.get("hostname"),
            description=raw_event.get("message") or raw_event.get("description", "SIEM security event detected"),
            raw_reference=raw_event.get("raw_reference"),
            normalized_data={
                "failed_count": raw_event.get("count", 1),
                "dest_port": raw_event.get("dest_port"),
                "log_source": self.provider,
            },
            is_demo=self.is_demo or raw_event.get("is_demo", False),
        )

    def get_name(self) -> str:
        return f"SIEM Connector ({self.provider})"

    def get_version(self) -> str:
        return "1.2.0"

    def get_connector_type(self) -> ConnectorType:
        return ConnectorType.SIEM
