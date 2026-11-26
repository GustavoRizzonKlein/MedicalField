import json
import time
from datetime import datetime, timezone

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from . import db, security


class AccessLogMiddleware(BaseHTTPMiddleware):
    """Records date/time, IP, professional, method, route, status and duration of every request."""

    async def dispatch(self, request: Request, call_next):
        occurred_at = datetime.now(timezone.utc)
        started = time.perf_counter()
        response = await call_next(request)
        duration_ms = int((time.perf_counter() - started) * 1000)

        professional = getattr(request.state, "professional", None)
        forwarded_for = request.headers.get("x-forwarded-for")
        client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else "unknown")
        entry = {
            "occurredAt": occurred_at.isoformat(),
            "clientIp": client_ip,
            "professionalId": professional.id if professional else None,
            "method": request.method,
            "route": request.url.path,
            "statusCode": response.status_code,
            "durationMs": duration_ms,
        }
        print(json.dumps({"type": "access", "service": "documents", **entry}), flush=True)
        try:
            with db.connection() as conn, conn.cursor() as cursor:
                cursor.execute(
                    """INSERT INTO access_log (occurred_at, client_ip, professional_id, method, route, status_code, duration_ms)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (occurred_at.replace(tzinfo=None), client_ip, entry["professionalId"], request.method,
                     request.url.path, response.status_code, duration_ms),
                )
        except Exception as error:  # the log must never break the request
            print(f"[access-log] failed to store entry: {error}", flush=True)
        return response


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """Every route requires a valid Bearer token (login lives in the identity service),
    except the Swagger UI and its OpenAPI document."""

    PUBLIC_PATHS = ("/docs", "/openapi.json")

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.PUBLIC_PATHS:
            return await call_next(request)
        header = request.headers.get("authorization", "")
        if not header.startswith("Bearer "):
            return JSONResponse({"error": "Missing Bearer token"}, status_code=401)
        try:
            request.state.professional = security.verify(header[7:])
        except security.InvalidToken as error:
            return JSONResponse({"error": str(error)}, status_code=401)
        return await call_next(request)
