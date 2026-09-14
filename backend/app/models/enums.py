from enum import StrEnum

from sqlalchemy import Enum as SAEnum


class UserRole(StrEnum):
    ADMIN = "admin"
    CISO = "ciso"
    SECURITY_ANALYST = "security_analyst"
    RISK_MANAGER = "risk_manager"
    EXECUTIVE = "executive"


class AssetType(StrEnum):
    SERVER = "server"
    APPLICATION = "application"
    DATABASE = "database"
    ENDPOINT = "endpoint"
    CLOUD_RESOURCE = "cloud_resource"
    IDENTITY = "identity"
    NETWORK_DEVICE = "network_device"
    BUSINESS_SERVICE = "business_service"


class Severity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RemediationStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    MITIGATED = "mitigated"
    ACCEPTED = "accepted"
    CLOSED = "closed"


class ImplementationStatus(StrEnum):
    PLANNED = "planned"
    PARTIAL = "partial"
    IMPLEMENTED = "implemented"
    NOT_IMPLEMENTED = "not_implemented"


class RiskStatus(StrEnum):
    OPEN = "open"
    MONITORING = "monitoring"
    TREATED = "treated"
    ACCEPTED = "accepted"
    CLOSED = "closed"


class IncidentStatus(StrEnum):
    NEW = "new"
    INVESTIGATING = "investigating"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ComplianceStatus(StrEnum):
    COMPLIANT = "compliant"
    PARTIAL = "partial"
    NON_COMPLIANT = "non_compliant"
    NOT_ASSESSED = "not_assessed"


class VerificationStatus(StrEnum):
    PENDING = "pending"
    RECORDED = "recorded"
    VERIFIED = "verified"
    FAILED = "failed"


class RiskLevel(StrEnum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


def enum_column(enum_cls: type[StrEnum], length: int = 32) -> SAEnum:
    return SAEnum(
        enum_cls,
        native_enum=False,
        length=length,
        values_callable=lambda members: [member.value for member in members],
    )
