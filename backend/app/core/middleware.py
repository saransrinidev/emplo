"""Custom middleware for request context (IP, User Agent) used by audit logging."""
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# Context vars accessible from anywhere in a request lifecycle
request_ip: ContextVar[str | None] = ContextVar("request_ip", default=None)
request_user_agent: ContextVar[str | None] = ContextVar("request_user_agent", default=None)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Extracts IP and User-Agent from each request into context vars."""

    async def dispatch(self, request: Request, call_next):
        # Get real IP (X-Forwarded-For for proxied requests, else client host)
        forwarded = request.headers.get("x-forwarded-for")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
        ua = request.headers.get("user-agent")

        token_ip = request_ip.set(ip)
        token_ua = request_user_agent.set(ua)
        try:
            response = await call_next(request)
            return response
        finally:
            request_ip.reset(token_ip)
            request_user_agent.reset(token_ua)
