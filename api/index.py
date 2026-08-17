import os
import sys

# The existing backend uses imports such as `import database`, so expose
# backend/ on the Python module path without changing the backend itself.
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app as backend_app


class ApiPrefixMiddleware:
    """Expose the FastAPI backend under Vercel's /api/* function path."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") in ("http", "websocket"):
            path = scope.get("path", "")
            if path == "/api":
                scope = dict(scope)
                scope["path"] = "/"
            elif path.startswith("/api/"):
                scope = dict(scope)
                scope["path"] = path[4:]
        await self.app(scope, receive, send)


app = ApiPrefixMiddleware(backend_app)
