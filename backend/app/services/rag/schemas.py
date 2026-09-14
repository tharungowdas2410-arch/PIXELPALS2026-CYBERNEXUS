"""Schemas for RAG document ingestion and retrieval."""

from typing import Any
from uuid import UUID
from pydantic import BaseModel, Field


class KnowledgeDocumentCreate(BaseModel):
    title: str
    document_type: str = "framework"
    framework: str = "general"
    content: str
    source: str
    version: str = "1.0"


class RAGSearchResult(BaseModel):
    document_id: str
    document_title: str
    framework: str
    source: str
    chunk_index: int
    content: str
    similarity: float
    metadata: dict[str, Any] = Field(default_factory=dict)

    @property
    def category(self) -> str:
        return self.framework

    @property
    def score(self) -> float:
        return self.similarity
