import re
from collections.abc import Callable

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send


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


def _scope_origin(scope: Scope) -> str | None:
    for key, value in scope.get("headers") or []:
        if key == b"origin":
            return value.decode("latin-1")
    return None


class ForceAccessControlASGIMiddleware:
    """
    ASGI puro: envuelve `send` y asegura cabeceras CORS en toda respuesta
    (incluidos 4xx/5xx y excepciones) si el origen está permitido.

    Debe envolver **toda** la app FastAPI/Starlette (exportada como `app` en
    uvicorn), no solo como middleware interno: `ServerErrorMiddleware` envía
    los 500 del `@app.exception_handler(Exception)` con el `send` que recibe;
    si este wrapper es el más externo, esas respuestas también llevan CORS.
    """

    def __init__(self, app: ASGIApp, *, origin_allowed: Callable[[str], bool]):
        self.app = app
        self._origin_allowed = origin_allowed

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        origin = _scope_origin(scope)
        if not origin or not self._origin_allowed(origin):
            await self.app(scope, receive, send)
            return

        async def send_with_cors(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                if "access-control-allow-origin" not in headers:
                    headers["Access-Control-Allow-Origin"] = origin
                    headers["Access-Control-Allow-Credentials"] = "true"
                    headers.add_vary_header("Origin")
            await send(message)

        await self.app(scope, receive, send_with_cors)
