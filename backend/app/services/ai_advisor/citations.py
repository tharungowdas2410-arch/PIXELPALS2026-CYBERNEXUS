"""Citation and evidence tracking for AI Advisor responses."""

from datetime import UTC, datetime
from typing import Any
from app.services.ai_advisor.schemas import CitationItem


class CitationCollector:
    """Collects and deduplicates backend evidence citations during tool execution."""

    def __init__(self) -> None:
        self._citations: dict[str, CitationItem] = {}

    def add(
        self,
        source_type: str,
        source_id: str,
        description: str,
        *,
        metadata: dict[str, Any] | None = None,
        timestamp: str | None = None,
    ) -> CitationItem:
        key = f"{source_type}:{source_id}"
        ts = timestamp or datetime.now(UTC).isoformat()
        item = CitationItem(
            source_type=source_type,
            source_id=str(source_id),
            description=description,
            timestamp=ts,
            metadata=metadata or {},
        )
        self._citations[key] = item
        return item

    def get_all(self) -> list[CitationItem]:
        return list(self._citations.values())

    def clear(self) -> None:
        self._citations.clear()
