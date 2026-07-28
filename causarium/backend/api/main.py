from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from backend.config import get_settings

settings = get_settings()

app = FastAPI(title="CAUSARIUM Reality Intelligence Platform", version="1.0.0")

# CORS — allow the Vite dev server (and, by default, any origin) to call the API.
_origins = ["*"] if settings.CORS_ORIGINS.strip() == "*" else [
    o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "service": "causarium", "offline_llm": settings.offline}


@app.get("/", tags=["meta"])
async def root() -> dict:
    return {
        "name": "CAUSARIUM Reality Intelligence Platform",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "create_simulation": "POST /v1/simulations",
            "get_simulation": "GET /v1/simulations/{id}",
            "discovery": "GET /v1/simulations/{id}/discovery",
            "stream": "WS /v1/simulations/{id}/stream",
            "report": "POST /v1/simulations/{id}/report",
        },
    }


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Starting CAUSARIUM backend (LLM offline={})", settings.offline)


# Core engine + catalogue routers (always available).
from backend.api.routers.simulations import router as simulations_router  # noqa: E402
from backend.api.routers.catalog import router as catalog_router  # noqa: E402
from backend.api.routers.auth import router as auth_router  # noqa: E402
from backend.api.routers.scenario import router as scenario_router  # noqa: E402

app.include_router(simulations_router, prefix="/v1/simulations", tags=["simulations"])
app.include_router(catalog_router, prefix="/v1/catalog", tags=["catalog"])
app.include_router(auth_router, prefix="/v1/auth", tags=["auth"])
app.include_router(scenario_router, prefix="/v1/scenario", tags=["scenario"])


# Optional / auxiliary routers — include defensively so a single broken stub
# never prevents the platform from booting.
def _try_include(module_path: str, attr: str, **kwargs) -> None:
    try:
        module = __import__(module_path, fromlist=[attr])
        app.include_router(getattr(module, attr), **kwargs)
    except Exception as e:  # noqa: BLE001
        logger.warning("Skipping router {} ({}: {})", module_path, type(e).__name__, e)


_try_include("backend.api.routers.intervention", "router", prefix="/v1", tags=["interventions"])
_try_include("backend.api.routers.reports", "router", tags=["reports"])
_try_include("backend.api.routers.developer", "router", prefix="/v1", tags=["developer"])
_try_include("backend.api.routers.admin", "router", prefix="/v1", tags=["admin"])
