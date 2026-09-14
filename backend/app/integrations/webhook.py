"""Webhook Security: HMAC verification, replay protection, timestamp validation, and rate limiting."""

import hashlib
import hmac
import time
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, Request, status


class ReplayProtectionCache:
    """In-memory sliding window cache to prevent webhook replay attacks."""

    def __init__(self, max_size: int = 10000, ttl_seconds: int = 300) -> None:
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, float] = OrderedDict()

    def check_and_add(self, key: str) -> bool:
        """Return True if nonce/hash is new and added, False if duplicate (replay)."""
        now = time.time()
        # Clean expired
        while self._cache:
            first_key, ts = next(iter(self._cache.items()))
            if now - ts > self.ttl_seconds:
                self._cache.pop(first_key)
            else:
                break

        if key in self._cache:
            return False  # Replay detected

        if len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)

        self._cache[key] = now
        return True


# Global replay cache
replay_cache = ReplayProtectionCache()


def verify_hmac_signature(payload_bytes: bytes, secret: str, signature_header: str | None) -> bool:
    """Verify HMAC-SHA256 signature from webhook header.

    Format expected: 'sha256=<hex_digest>' or direct hex digest.
    """
    if not secret:
        # If no secret is configured on this connector, allow through (e.g. demo mode)
        return True

    if not signature_header:
        return False

    expected_sig = signature_header
    if signature_header.startswith("sha256="):
        expected_sig = signature_header[7:]

    computed_sig = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed_sig, expected_sig)


def validate_webhook_timestamp(timestamp_header: str | None, max_drift_seconds: int = 300) -> None:
    """Validate webhook timestamp to protect against replay attacks."""
    if not timestamp_header:
        return  # Optional if sender doesn't provide timestamp header

    try:
        if timestamp_header.isdigit():
            epoch = float(timestamp_header)
        else:
            # ISO timestamp
            dt = datetime.fromisoformat(timestamp_header.replace("Z", "+00:00"))
            epoch = dt.timestamp()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook timestamp format",
        )

    now = time.time()
    if abs(now - epoch) > max_drift_seconds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook timestamp expired or drifted beyond {max_drift_seconds}s window",
        )


async def validate_webhook_request(
    request: Request,
    secret: str | None = None,
    max_payload_bytes: int = 1_048_576,  # 1MB limit
) -> tuple[bytes, dict[str, Any]]:
    """Validate webhook size, signature, timestamp, and replay protection."""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > max_payload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Payload exceeds maximum allowed size of {max_payload_bytes} bytes",
        )

    body = await request.body()
    if len(body) > max_payload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Payload exceeds maximum allowed size of {max_payload_bytes} bytes",
        )

    # Validate HMAC signature if secret configured
    sig_header = request.headers.get("X-Hub-Signature-256") or request.headers.get("X-Signature-SHA256")
    if secret and not verify_hmac_signature(body, secret, sig_header):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid HMAC signature for webhook payload",
        )

    # Validate timestamp
    ts_header = request.headers.get("X-Webhook-Timestamp") or request.headers.get("X-Timestamp")
    validate_webhook_timestamp(ts_header)

    # Replay protection
    cache_key = hashlib.sha256(body + (sig_header or "").encode("utf-8")).hexdigest()
    if not replay_cache.check_and_add(cache_key):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Replay detected: this webhook payload was already received within the protection window",
        )

    try:
        json_data = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON in webhook request body",
        )

    return body, json_data
