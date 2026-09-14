"""Audit Logging Service for Enterprise Security and Compliance Tracking."""

from datetime import datetime, timezone
import hashlib
import json
import logging
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    """Provides append-only, tamper-resistant audit logging across platform operations."""

    @staticmethod
    async def log_action(
        session: AsyncSession,
        organization_id: UUID,
        action: str,
        entity_type: str,
        entity_id: str | None = None,
        user_id: UUID | None = None,
        result: str = "SUCCESS",
        ip_address: str | None = None,
        user_agent: str | None = None,
        correlation_id: str | None = None,
        details: dict[str, Any] | None = None,
        request: Any = None,
    ) -> AuditLog:
        """Create and persist an append-only audit log record."""
        if request is not None:
            if not ip_address and hasattr(request, "client") and request.client:
                ip_address = request.client.host
            if not user_agent and hasattr(request, "headers"):
                user_agent = request.headers.get("user-agent")
            if not correlation_id:
                if hasattr(request, "state") and hasattr(request.state, "request_id"):
                    correlation_id = request.state.request_id
                elif hasattr(request, "headers"):
                    correlation_id = request.headers.get("X-Request-ID")

        payload = details or {}

        # If this is a critical decision, compute an optional verification hash
        if action in ("OPTIMIZATION_RUN", "RISK_CALCULATE", "POLICY_CHANGE", "ROLE_CHANGE"):
            canonical_str = json.dumps(payload, sort_keys=True, default=str)
            payload["_decision_hash"] = hashlib.sha256(canonical_str.encode()).hexdigest()

        entry = AuditLog(
            id=uuid4(),
            organization_id=organization_id,
            user_id=user_id,
            action=action.upper(),
            entity_type=entity_type.upper(),
            entity_id=str(entity_id) if entity_id else None,
            result=result.upper(),
            ip_address=ip_address,
            user_agent=user_agent,
            correlation_id=correlation_id,
            details=payload,
            timestamp=datetime.now(timezone.utc),
        )
        session.add(entry)
        try:
            await session.commit()
            await session.refresh(entry)
        except Exception as exc:
            logger.error("Failed to commit audit log entry: %s", exc)
            await session.rollback()
        return entry

    @staticmethod
    async def query_logs(
        session: AsyncSession,
        organization_id: UUID,
        action: str | None = None,
        entity_type: str | None = None,
        user_id: UUID | None = None,
        result: str | None = None,
        correlation_id: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[AuditLog], int]:
        """Query audit logs scoped strictly to the authenticated organization."""
        query = select(AuditLog).where(AuditLog.organization_id == organization_id)

        if action:
            query = query.where(AuditLog.action == action.upper())
        if entity_type:
            query = query.where(AuditLog.entity_type == entity_type.upper())
        if user_id:
            query = query.where(AuditLog.user_id == user_id)
        if result:
            query = query.where(AuditLog.result == result.upper())
        if correlation_id:
            query = query.where(AuditLog.correlation_id == correlation_id)
        if start_time:
            query = query.where(AuditLog.timestamp >= start_time)
        if end_time:
            query = query.where(AuditLog.timestamp <= end_time)

        # Count total
        count_stmt = select(AuditLog.id).where(AuditLog.organization_id == organization_id)
        if action:
            count_stmt = count_stmt.where(AuditLog.action == action.upper())
        if entity_type:
            count_stmt = count_stmt.where(AuditLog.entity_type == entity_type.upper())
        if user_id:
            count_stmt = count_stmt.where(AuditLog.user_id == user_id)
        if result:
            count_stmt = count_stmt.where(AuditLog.result == result.upper())
        if correlation_id:
            count_stmt = count_stmt.where(AuditLog.correlation_id == correlation_id)
        if start_time:
            count_stmt = count_stmt.where(AuditLog.timestamp >= start_time)
        if end_time:
            count_stmt = count_stmt.where(AuditLog.timestamp <= end_time)

        all_ids = list((await session.scalars(count_stmt)).all())
        total = len(all_ids)

        # Fetch page
        query = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit)
        logs = list((await session.scalars(query)).all())
        return logs, total
