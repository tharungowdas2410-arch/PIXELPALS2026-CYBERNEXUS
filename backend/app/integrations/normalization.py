"""Normalization schemas and constants for continuous security telemetry."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID
from pydantic import BaseModel, Field


class EventType(str, Enum):
    """Supported security event types across all enterprise connectors."""

    AUTH_FAILURE = "AUTH_FAILURE"
    AUTH_SUCCESS = "AUTH_SUCCESS"
    PRIVILEGED_LOGIN = "PRIVILEGED_LOGIN"
    MFA_DISABLED = "MFA_DISABLED"
    MALWARE_DETECTED = "MALWARE_DETECTED"
    ENDPOINT_ALERT = "ENDPOINT_ALERT"
    NETWORK_ALERT = "NETWORK_ALERT"
    VULNERABILITY_FOUND = "VULNERABILITY_FOUND"
    VULNERABILITY_REMEDIATED = "VULNERABILITY_REMEDIATED"
    CLOUD_MISCONFIGURATION = "CLOUD_MISCONFIGURATION"
    THREAT_INTELLIGENCE_MATCH = "THREAT_INTELLIGENCE_MATCH"
    DATA_EXPOSURE = "DATA_EXPOSURE"
    POLICY_VIOLATION = "POLICY_VIOLATION"
    BACKUP_FAILURE = "BACKUP_FAILURE"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"


class EventSeverity(str, Enum):
    """Normalized severity levels."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class ConnectorType(str, Enum):
    """Supported enterprise telemetry connectors."""

    SIEM = "SIEM"
    EDR = "EDR"
    IAM = "IAM"
    CSPM = "CSPM"
    VULNERABILITY = "VULNERABILITY"
    THREAT_INTELLIGENCE = "THREAT_INTELLIGENCE"


class NormalizedSecurityEvent(BaseModel):
    """Normalized security telemetry event payload."""

    source: str
    source_event_id: str | None = None
    event_type: EventType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    severity: EventSeverity = EventSeverity.MEDIUM
    asset_id: UUID | None = None
    identity_id: str | None = None
    ip_address: str | None = None
    hostname: str | None = None
    description: str
    raw_reference: str | None = None
    normalized_data: dict[str, Any] = Field(default_factory=dict)
    is_demo: bool = False
