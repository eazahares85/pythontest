import re
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


def build_origin_allowed(origins: list[str], allow_render_regex: bool) -> Callable[[str], bool]:
    origin_set = frozenset(origins)
    rx = re.compile(r"https://[\w.-]+\.onrender\.com$") if allow_render_regex else None

    def origin_allowed(origin: str) -> bool:
        if origin in origin_set:
            return True
        if rx is not None and rx.fullmatch(origin):
            return True
        return False

    return origin_allowed


class MissingCORSPatchMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, origin_allowed: Callable[[str], bool]):
        super().__init__(app)
        self._origin_allowed = origin_allowed

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        origin = request.headers.get("origin")
        if not origin or not self._origin_allowed(origin):
            return response
        if response.headers.get("access-control-allow-origin"):
            return response
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
