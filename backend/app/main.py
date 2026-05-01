from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.mongo import close_mongo
from app.routers import auth, clientes, intereses


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await close_mongo()


app = FastAPI(title="API local Innovasoft", lifespan=lifespan)

_settings = get_settings()
_origins = [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
if not _origins:
    _origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(clientes.router, prefix="/api")
app.include_router(intereses.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


def _maybe_mount_frontend() -> None:
    settings = get_settings()
    index = _frontend_dist / "index.html"
    if not settings.serve_frontend or not index.is_file():
        return

    assets = _frontend_dist / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets)), name="spa_assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Recurso no encontrado")
        return FileResponse(index)


_maybe_mount_frontend()
