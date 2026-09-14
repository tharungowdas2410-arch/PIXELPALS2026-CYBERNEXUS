"""Connector Registry managing active enterprise connectors and mock instances."""

from typing import Any

from app.integrations.base import SecurityConnector
from app.integrations.connectors.cspm import CSPMConnector
from app.integrations.connectors.edr import EDRConnector
from app.integrations.connectors.iam import IAMConnector
from app.integrations.connectors.siem import SIEMConnector
from app.integrations.connectors.threat_intelligence import ThreatIntelligenceConnector
from app.integrations.connectors.vulnerability import VulnerabilityConnector
from app.integrations.mocks.mock_cspm import MockCSPMConnector
from app.integrations.mocks.mock_edr import MockEDRConnector
from app.integrations.mocks.mock_iam import MockIAMConnector
from app.integrations.mocks.mock_siem import MockSIEMConnector
from app.integrations.mocks.mock_threat_intelligence import MockThreatIntelligenceConnector
from app.integrations.mocks.mock_vulnerability import MockVulnerabilityConnector
from app.integrations.normalization import ConnectorType


class ConnectorRegistry:
    """Singleton registry for managing connector instances and querying global integration health."""

    def __init__(self, is_demo: bool = True) -> None:
        self.is_demo = is_demo
        self._connectors: dict[str, SecurityConnector] = {}
        self._initialize_default_connectors()

    def _initialize_default_connectors(self) -> None:
        """Initialize all standard connectors with demo-friendly defaults."""
        if self.is_demo:
            self.register("siem", MockSIEMConnector())
            self.register("edr", MockEDRConnector())
            self.register("iam", MockIAMConnector())
            self.register("cspm", MockCSPMConnector())
            self.register("vulnerability", MockVulnerabilityConnector())
            self.register("threat_intelligence", MockThreatIntelligenceConnector())
        else:
            self.register("siem", SIEMConnector(is_demo=False))
            self.register("edr", EDRConnector(is_demo=False))
            self.register("iam", IAMConnector(is_demo=False))
            self.register("cspm", CSPMConnector(is_demo=False))
            self.register("vulnerability", VulnerabilityConnector(is_demo=False))
            self.register("threat_intelligence", ThreatIntelligenceConnector(is_demo=False))

    def register(self, key: str, connector: SecurityConnector) -> None:
        """Register or replace a connector by key."""
        self._connectors[key.lower()] = connector

    def get(self, key: str) -> SecurityConnector | None:
        """Get a connector by key (e.g. 'siem', 'edr')."""
        normalized_key = key.lower().replace("-", "_")
        return self._connectors.get(normalized_key)

    def list_connectors(self) -> dict[str, SecurityConnector]:
        """List all active connector mappings."""
        return dict(self._connectors)

    def get_health_status(self) -> dict[str, Any]:
        """Query health status from all registered connectors."""
        results = {}
        for key, connector in self._connectors.items():
            results[key] = {
                "name": connector.get_name(),
                "version": connector.get_version(),
                "type": connector.get_connector_type().value,
                **connector.health(),
            }
        return results


# Global default registry instance
connector_registry = ConnectorRegistry(is_demo=True)
