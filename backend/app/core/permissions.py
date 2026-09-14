"""Granular Role-Based Access Control (RBAC) and Permission Registry."""

from enum import StrEnum
from fastapi import HTTPException, status

from app.models.enums import UserRole
from app.models.user import User


class Permission(StrEnum):
    # Assets
    ASSETS_READ = "assets:read"
    ASSETS_WRITE = "assets:write"
    ASSETS_DELETE = "assets:delete"

    # Vulnerabilities
    VULNERABILITIES_READ = "vulnerabilities:read"
    VULNERABILITIES_WRITE = "vulnerabilities:write"

    # Threats
    THREATS_READ = "threats:read"
    THREATS_WRITE = "threats:write"

    # Controls
    CONTROLS_READ = "controls:read"
    CONTROLS_WRITE = "controls:write"

    # Risks & Scenarios
    RISKS_READ = "risks:read"
    RISKS_WRITE = "risks:write"
    SCENARIOS_RUN = "scenarios:run"

    # Financial Risk & Investments
    FINANCIAL_READ = "financial:read"
    INVESTMENTS_READ = "investments:read"
    INVESTMENTS_OPTIMIZE = "investments:optimize"

    # Incidents
    INCIDENTS_READ = "incidents:read"
    INCIDENTS_WRITE = "incidents:write"

    # Attack Paths & Graph
    ATTACK_PATHS_READ = "attack_paths:read"
    GRAPH_SYNC = "graph:sync"

    # AI Risk Advisor
    AI_ADVISOR_ASK = "ai_advisor:ask"
    AI_ADVISOR_HISTORY = "ai_advisor:history"

    # Integrations & Telemetry
    INTEGRATIONS_READ = "integrations:read"
    INTEGRATIONS_WRITE = "integrations:write"
    TELEMETRY_INGEST = "telemetry:ingest"

    # Compliance
    COMPLIANCE_READ = "compliance:read"
    COMPLIANCE_WRITE = "compliance:write"

    # Reports
    REPORTS_READ = "reports:read"
    REPORTS_EXPORT = "reports:export"

    # Audit & User Administration
    AUDIT_READ = "audit:read"
    USERS_MANAGE = "users:manage"
    SYSTEM_CONFIG = "system:config"


ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.ADMIN: set(Permission),  # All permissions
    UserRole.CISO: {
        Permission.ASSETS_READ,
        Permission.ASSETS_WRITE,
        Permission.VULNERABILITIES_READ,
        Permission.VULNERABILITIES_WRITE,
        Permission.THREATS_READ,
        Permission.CONTROLS_READ,
        Permission.CONTROLS_WRITE,
        Permission.RISKS_READ,
        Permission.RISKS_WRITE,
        Permission.SCENARIOS_RUN,
        Permission.FINANCIAL_READ,
        Permission.INVESTMENTS_READ,
        Permission.INVESTMENTS_OPTIMIZE,
        Permission.INCIDENTS_READ,
        Permission.ATTACK_PATHS_READ,
        Permission.AI_ADVISOR_ASK,
        Permission.AI_ADVISOR_HISTORY,
        Permission.INTEGRATIONS_READ,
        Permission.COMPLIANCE_READ,
        Permission.COMPLIANCE_WRITE,
        Permission.REPORTS_READ,
        Permission.REPORTS_EXPORT,
        Permission.AUDIT_READ,
    },
    UserRole.SECURITY_ANALYST: {
        Permission.ASSETS_READ,
        Permission.ASSETS_WRITE,
        Permission.VULNERABILITIES_READ,
        Permission.VULNERABILITIES_WRITE,
        Permission.THREATS_READ,
        Permission.THREATS_WRITE,
        Permission.CONTROLS_READ,
        Permission.INCIDENTS_READ,
        Permission.INCIDENTS_WRITE,
        Permission.ATTACK_PATHS_READ,
        Permission.INTEGRATIONS_READ,
        Permission.TELEMETRY_INGEST,
        Permission.REPORTS_READ,
        Permission.AI_ADVISOR_ASK,
    },
    UserRole.RISK_MANAGER: {
        Permission.ASSETS_READ,
        Permission.VULNERABILITIES_READ,
        Permission.CONTROLS_READ,
        Permission.CONTROLS_WRITE,
        Permission.RISKS_READ,
        Permission.RISKS_WRITE,
        Permission.SCENARIOS_RUN,
        Permission.FINANCIAL_READ,
        Permission.INVESTMENTS_READ,
        Permission.INVESTMENTS_OPTIMIZE,
        Permission.COMPLIANCE_READ,
        Permission.COMPLIANCE_WRITE,
        Permission.REPORTS_READ,
        Permission.REPORTS_EXPORT,
        Permission.AI_ADVISOR_ASK,
        Permission.AI_ADVISOR_HISTORY,
    },
    UserRole.EXECUTIVE: {
        Permission.ASSETS_READ,
        Permission.RISKS_READ,
        Permission.FINANCIAL_READ,
        Permission.INVESTMENTS_READ,
        Permission.REPORTS_READ,
        Permission.REPORTS_EXPORT,
        Permission.AI_ADVISOR_ASK,
    },
}


def check_user_permission(user: User, permission: Permission) -> bool:
    """Evaluate whether a user's role grants a given permission."""
    allowed = ROLE_PERMISSIONS.get(user.role, set())
    return permission in allowed


def enforce_permission(user: User, permission: Permission) -> None:
    """Raise HTTP 403 Forbidden if the user lacks the required permission."""
    if not check_user_permission(user, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Insufficient permissions for '{permission.value}'",
        )
