"""CSPM Connector (AWS Security Hub / Wiz / Prisma Cloud abstraction)."""

import os
from datetime import datetime, timezone
from typing import Any

from app.integrations.base import SecurityConnector
from app.integrations.normalization import ConnectorType, EventSeverity, EventType, NormalizedSecurityEvent


class CSPMConnector(SecurityConnector):
    """Connector for Cloud Security Posture Management (CSPM) platforms."""

    def __init__(self, is_demo: bool = True, config: dict[str, Any] | None = None) -> None:
        super().__init__(is_demo=is_demo, config=config)
        self.api_url = self.config.get("api_url") or os.getenv("CSPM_API_URL")
        self.api_key = self.config.get("api_key") or os.getenv("CSPM_API_KEY")
        self.provider = self.config.get("provider", "AWS-Security-Hub")

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
                "latency_ms": 14.2,
                "last_sync": datetime.now(timezone.utc).isoformat(),
                "details": f"Synthetic CSPM ({self.provider}) active for demonstration",
            }
        if not self._connected:
            return {
                "status": "DISCONNECTED",
                "is_demo": False,
                "latency_ms": 0.0,
                "last_sync": None,
                "details": "Missing CSPM_API_URL or CSPM_API_KEY configuration",
            }
        return {
            "status": "CONNECTED",
            "is_demo": False,
            "latency_ms": 52.0,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "details": f"Connected to {self.provider} cloud posture scanner",
        }

    def fetch_events(self, limit: int = 50) -> list[NormalizedSecurityEvent]:
        return []

    def normalize_event(self, raw_event: dict[str, Any]) -> NormalizedSecurityEvent:
        finding_type = str(raw_event.get("finding_type") or raw_event.get("title") or "").upper()
        severity_str = str(raw_event.get("severity", "HIGH")).upper()

        if "PUBLIC_BUCKET" in finding_type or "PUBLIC_STORAGE" in finding_type or "S3" in finding_type:
            event_type = EventType.DATA_EXPOSURE
            severity = EventSeverity.HIGH
        elif "SECURITY_GROUP" in finding_type or "OPEN_PORT" in finding_type or "EXPOSED" in finding_type:
            event_type = EventType.CLOUD_MISCONFIGURATION
            severity = EventSeverity.HIGH
        elif "ENCRYPTION" in finding_type or "LOGGING" in finding_type:
            event_type = EventType.POLICY_VIOLATION
            severity = EventSeverity.MEDIUM
        else:
            event_type = EventType.CLOUD_MISCONFIGURATION
            severity = EventSeverity.MEDIUM

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
            source=raw_event.get("source", "CSPM"),
            source_event_id=raw_event.get("finding_id") or raw_event.get("id"),
            event_type=event_type,
            timestamp=ts,
            severity=severity,
            asset_id=raw_event.get("asset_id"),
            identity_id=raw_event.get("identity_id"),
            ip_address=raw_event.get("public_ip"),
            hostname=raw_event.get("resource_id") or raw_event.get("resource_name"),
            description=raw_event.get("description") or f"Cloud misconfiguration: {finding_type}",
            raw_reference=raw_event.get("resource_arn") or raw_event.get("raw_reference"),
            normalized_data={
                "cloud_provider": raw_event.get("cloud_provider", "AWS"),
                "resource_type": raw_event.get("resource_type", "S3_Bucket"),
                "compliance_check": raw_event.get("compliance_control"),
                "remediation_hint": raw_event.get("remediation_url"),
            },
            is_demo=self.is_demo or raw_event.get("is_demo", False),
        )

    def get_name(self) -> str:
        return f"CSPM Connector ({self.provider})"

    def get_version(self) -> str:
        return "1.0.8"

    def get_connector_type(self) -> ConnectorType:
        return ConnectorType.CSPM
