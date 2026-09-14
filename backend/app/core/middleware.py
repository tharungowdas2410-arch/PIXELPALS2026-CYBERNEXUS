"""Enterprise Security Middlewares: Request Correlation IDs, Security Headers, and Rate Limiting."""

from collections import defaultdict
import time
from uuid import uuid4

from fastapi import HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.config import settings


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Ensures every request has a traceable correlation ID for end-to-end auditability."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        corr_id = request.headers.get("X-Request-ID") or request.headers.get("X-Correlation-ID") or str(uuid4())
        request.state.request_id = corr_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = corr_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Applies defense-in-depth HTTP security response headers."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        # Do not block Swagger/OpenAPI assets during local development
        is_docs = request.url.path in ("/docs", "/redoc", "/openapi.json")

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=(), payment=()"

        if not is_docs:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "connect-src 'self' http: https: ws: wss:; "
                "frame-ancestors 'none';"
            )

        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window in-memory rate limiter per client IP/route category."""

    def __init__(self, app, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.window_seconds = window_seconds
        # client_ip:list_of_timestamps
        self._history: dict[str, list[float]] = defaultdict(list)

    def _get_limit_for_path(self, path: str) -> int:
        if "/auth/" in path:
            return settings.auth_rate_limit
        if "/advisor/" in path:
            return settings.ai_rate_limit
        if "/integrations/webhook/" in path:
            return settings.webhook_rate_limit
        return settings.api_rate_limit

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not settings.rate_limit_enabled:
            return await call_next(request)

        # In test environment, bypass unless test specifically exercises rate limits
        if settings.app_env == "test" and not request.headers.get("X-Test-Rate-Limit"):
            return await call_next(request)

        # Exempt health and docs checks
        if request.url.path in ("/health", "/health/live", "/health/ready", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        limit = 1 if request.headers.get("X-Test-Rate-Limit") == "1" else self._get_limit_for_path(request.url.path)
        key = f"{client_ip}:{request.url.path.split('/')[3] if len(request.url.path.split('/')) > 3 else 'root'}"

        now = time.time()
        cutoff = now - self.window_seconds

        # Clean expired timestamps
        history = [ts for ts in self._history[key] if ts > cutoff]

        if len(history) >= limit:
            retry_after = int(cutoff + self.window_seconds - now) + 1
            return Response(
                content=f'{{"error": {{"code": "rate_limit_exceeded", "message": "Too many requests. Please retry in {retry_after} seconds.", "request_id": "{getattr(request.state, "request_id", "")}"}}}}',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json",
                headers={"Retry-After": str(retry_after)},
            )

        history.append(now)
        self._history[key] = history

        return await call_next(request)
