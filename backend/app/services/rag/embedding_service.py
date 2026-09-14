"""Embedding service with OpenAI API support and pure-Python deterministic fallback."""

import hashlib
import math
import re
from typing import Sequence

from app.core.ai_config import get_ai_config

VECTOR_DIM = 64


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9_\-\.]{2,}", text.lower())


def fallback_embed(text: str, dim: int = VECTOR_DIM) -> list[float]:
    """Generates a deterministic normalized dense float vector from text using hash hashing.

    Guarantees fast, reproducible semantic comparison without external API dependencies.
    """
    tokens = _tokenize(text)
    if not tokens:
        return [0.0] * dim

    vec = [0.0] * dim
    for token in tokens:
        # Generate 2 hashes per token to reduce collisions
        h1 = int(hashlib.md5(token.encode("utf-8")).hexdigest()[:8], 16)
        h2 = int(hashlib.sha1(token.encode("utf-8")).hexdigest()[:8], 16)
        idx1 = h1 % dim
        idx2 = h2 % dim
        vec[idx1] += 1.0
        vec[idx2] += 0.5

    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [round(x / norm, 6) for x in vec]
    return vec


def cosine_similarity(v1: Sequence[float], v2: Sequence[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    n1 = math.sqrt(sum(a * a for a in v1))
    n2 = math.sqrt(sum(b * b for b in v2))
    if n1 == 0 or n2 == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (n1 * n2)))


async def get_embedding(text: str) -> list[float]:
    """Generates an embedding vector using OpenAI if configured, else fallback."""
    cfg = get_ai_config()
    if cfg.is_active and cfg.openai_api_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={"Authorization": f"Bearer {cfg.openai_api_key}"},
                    json={"input": text[:2000], "model": "text-embedding-3-small"},
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["data"][0]["embedding"]
        except Exception:
            pass
    return fallback_embed(text)
