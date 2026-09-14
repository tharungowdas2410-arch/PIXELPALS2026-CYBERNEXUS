"""IAM Connector (Okta / Microsoft Entra ID / Ping Identity abstraction)."""

import os
from datetime import datetime, timezone
from typing import Any

from app.integrations.base import SecurityConnector
from app.integrations.normalization import ConnectorType, EventSeverity, EventType, NormalizedSecurityEvent


class IAMConnector(SecurityConnector):
    """Connector for Identity & Access Management (IAM) providers."""

    def __init__(self, is_demo: bool = True, config: dict[str, Any] | None = None) -> None:
        super().__init__(is_demo=is_demo, config=config)
        self.api_url = self.config.get("api_url") or os.getenv("IAM_API_URL")
        self.api_key = self.config.get("api_key") or os.getenv("IAM_API_KEY")
        self.provider = self.config.get("provider", "Okta-Identity")

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
                "latency_ms": 10.0,
                "last_sync": datetime.now(timezone.utc).isoformat(),
                "details": f"Synthetic IAM ({self.provider}) active for demonstration",
            }
        if not self._connected:
            return {
                "status": "DISCONNECTED",
                "is_demo": False,
                "latency_ms": 0.0,
                "last_sync": None,
                "details": "Missing IAM_API_URL or IAM_API_KEY configuration",
            }
        return {
            "status": "CONNECTED",
            "is_demo": False,
            "latency_ms": 29.5,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "details": f"Connected to {self.provider} directory",
        }

    def fetch_events(self, limit: int = 50) -> list[NormalizedSecurityEvent]:
        return []

    def normalize_event(self, raw_event: dict[str, Any]) -> NormalizedSecurityEvent:
        event_name = str(raw_event.get("event_type") or raw_event.get("name") or "").upper()
        severity_str = str(raw_event.get("severity", "MEDIUM")).upper()

        if "MFA" in event_name and ("DEACTIVATE" in event_name or "DISABLE" in event_name or "RESET" in event_name):
            event_type = EventType.MFA_DISABLED
            severity = EventSeverity.HIGH
        elif "PRIVILEGED" in event_name or "ADMIN_ROLE" in event_name:
            event_type = EventType.PRIVILEGED_LOGIN
            severity = EventSeverity.MEDIUM
        elif "FAIL" in event_name or "DENIED" in event_name:
            event_type = EventType.AUTH_FAILURE
            severity = EventSeverity.MEDIUM
        elif "TRAVEL" in event_name or "SUSPICIOUS" in event_name:
            event_type = EventType.SUSPICIOUS_ACTIVITY
            severity = EventSeverity.HIGH
        else:
            event_type = EventType.AUTH_SUCCESS
            severity = EventSeverity.INFO

        raw_sev = raw_event.get("severity")
        if raw_sev and str(raw_sev).upper() in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
            severity = EventSeverity(str(raw_sev).upper())

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
            source=raw_event.get("source", "IAM"),
            source_event_id=raw_event.get("event_id") or raw_event.get("id"),
            event_type=event_type,
            timestamp=ts,
            severity=severity,
            asset_id=raw_event.get("asset_id"),
            identity_id=raw_event.get("user") or raw_event.get("actor_email") or raw_event.get("identity_id"),
            ip_address=raw_event.get("client_ip") or raw_event.get("ip_address"),
            hostname=raw_event.get("hostname"),
            description=raw_event.get("description") or f"IAM event: {event_name}",
            raw_reference=raw_event.get("raw_reference"),
            normalized_data={
                "is_privileged": raw_event.get("is_privileged", False),
                "mfa_method": raw_event.get("mfa_method"),
                "geo_country": raw_event.get("country"),
                "geo_city": raw_event.get("city"),
            },
            is_demo=self.is_demo or raw_event.get("is_demo", False),
        )

    def get_name(self) -> str:
        return f"IAM Connector ({self.provider})"

    def get_version(self) -> str:
        return "1.0.4"

    def get_connector_type(self) -> ConnectorType:
        return ConnectorType.IAM
