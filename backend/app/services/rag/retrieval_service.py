"""Semantic and keyword-boosted retrieval of static cybersecurity knowledge."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.services.rag.document_service import seed_default_frameworks
from app.services.rag.embedding_service import cosine_similarity, fallback_embed
from app.services.rag.schemas import RAGSearchResult


from uuid import UUID


async def retrieve_relevant_documents(
    session: AsyncSession,
    query: str,
    top_k: int = 5,
    framework: str | None = None,
    organization_id: UUID | None = None,
) -> list[RAGSearchResult]:
    """Retrieves relevant framework guidance chunks matching the user's query."""
    # Ensure frameworks are seeded
    await seed_default_frameworks(session)

    stmt = select(KnowledgeChunk, KnowledgeDocument).join(
        KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id
    )
    if framework:
        stmt = stmt.where(KnowledgeDocument.framework.ilike(f"%{framework}%"))

    rows = list(await session.execute(stmt))
    if not rows:
        return []

    q_vec = fallback_embed(query)
    q_tokens = set(query.lower().split())

    scored_results: list[tuple[float, KnowledgeChunk, KnowledgeDocument]] = []
    for chunk, doc in rows:
        # Cosine similarity over dense embedding
        sim = cosine_similarity(q_vec, chunk.embedding or [])

        # Keyword boost for exact terms (e.g. "mfa", "backup", "cve", "segmentation", "rbi", "sebi", "nist")
        content_lower = chunk.content.lower()
        title_lower = doc.title.lower()
        fw_lower = doc.framework.lower()

        overlap = sum(1 for t in q_tokens if t in content_lower or t in title_lower or t in fw_lower)
        keyword_boost = min(0.35, overlap * 0.08)

        total_score = round(min(1.0, sim + keyword_boost), 4)
        if total_score >= 0.15:  # relevance threshold
            scored_results.append((total_score, chunk, doc))

    scored_results.sort(key=lambda item: item[0], reverse=True)

    results: list[RAGSearchResult] = []
    for score, chunk, doc in scored_results[:top_k]:
        results.append(
            RAGSearchResult(
                document_id=str(doc.id),
                document_title=doc.title,
                framework=doc.framework,
                source=doc.source,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                similarity=score,
                metadata=chunk.metadata_json or {},
            )
        )
    return results
