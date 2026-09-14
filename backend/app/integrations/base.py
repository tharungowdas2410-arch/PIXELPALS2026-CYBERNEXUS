"""Security Connector Interface for SIH 2026 Enterprise Telemetry Integrations."""

from abc import ABC, abstractmethod
from typing import Any

from app.integrations.normalization import ConnectorType, NormalizedSecurityEvent


class SecurityConnector(ABC):
    """Common connector interface for all security data sources (SIEM, EDR, IAM, CSPM, Vuln, Threat Intel)."""

    def __init__(self, is_demo: bool = True, config: dict[str, Any] | None = None) -> None:
        self.is_demo = is_demo
        self.config = config or {}
        self._connected = False

    @abstractmethod
    def connect(self) -> bool:
        """Establish connection or session with the security provider API."""
        pass

    @abstractmethod
    def disconnect(self) -> bool:
        """Close connection or active sessions."""
        pass

    @abstractmethod
    def health(self) -> dict[str, Any]:
        """Check connection health, latency, and status.

        Returns:
            dict containing:
                - status: "CONNECTED" | "DEMO" | "DISCONNECTED" | "ERROR"
                - is_demo: bool
                - latency_ms: float
                - last_sync: datetime | None
                - details: str
        """
        pass

    @abstractmethod
    def fetch_events(self, limit: int = 50) -> list[NormalizedSecurityEvent]:
        """Poll or query recent events from the connector data source."""
        pass

    @abstractmethod
    def normalize_event(self, raw_event: dict[str, Any]) -> NormalizedSecurityEvent:
        """Convert a raw vendor event into a standardized NormalizedSecurityEvent."""
        pass

    @abstractmethod
    def get_name(self) -> str:
        """Human-readable connector name (e.g. 'Splunk SIEM Connector')."""
        pass

    @abstractmethod
    def get_version(self) -> str:
        """Connector version string (e.g. '1.0.0')."""
        pass

    @abstractmethod
    def get_connector_type(self) -> ConnectorType:
        """Return the connector classification enum."""
        pass
