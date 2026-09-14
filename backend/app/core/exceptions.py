import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)


def _error_body(
    code: str,
    message: str,
    details: Any | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    err_dict: dict[str, Any] = {"code": code, "message": message}
    if request_id:
        err_dict["request_id"] = request_id
    payload: dict[str, Any] = {"error": err_dict}
    if details is not None:
        payload["error"]["details"] = details
    return payload


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None)
        code = (
            "not_found"
            if exc.status_code == 404
            else "forbidden"
            if exc.status_code == 403
            else "unauthorized"
            if exc.status_code == 401
            else "http_error"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(code, str(exc.detail), request_id=req_id),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=422,
            content=_error_body("validation_error", "Request validation failed", exc.errors(), request_id=req_id),
        )

    @app.exception_handler(IntegrityError)
    async def integrity_exception_handler(request: Request, exc: IntegrityError) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None)
        logger.warning("integrity_error", extra={"extra_data": {"detail": str(exc.orig)}})
        return JSONResponse(
            status_code=409,
            content=_error_body("conflict", "Resource already exists or violates a data integrity constraint", request_id=req_id),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None)
        logger.exception("unhandled_error", extra={"extra_data": {"type": type(exc).__name__, "request_id": req_id}})
        return JSONResponse(
            status_code=500,
            content=_error_body(
                "internal_error",
                "An unexpected internal error occurred. Please contact security administration with your request ID.",
                request_id=req_id,
            ),
        )
