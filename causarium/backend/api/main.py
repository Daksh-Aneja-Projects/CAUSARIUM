from __future__ import annotations

from fastapi import FastAPI
from loguru import logger

from backend.config import get_settings
from backend.api.routers.admin import router as admin_router
from backend.api.routers.developer import router as developer_router
from backend.api.routers.intervention import router as intervention_router
from backend.api.routers.reports import router as reports_router
from backend.api.routers.simulations import router as simulations_router


settings = get_settings()


app = FastAPI(title="CAUSARIUM Reality Intelligence Platform", version="1.0.0")


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Starting CAUSARIUM backend")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    logger.info("Shutting down CAUSARIUM backend")


app.include_router(simulations_router, prefix="/v1/simulations", tags=["simulations"])
app.include_router(intervention_router, prefix="/v1", tags=["interventions"])
app.include_router(reports_router, prefix="/v1", tags=["reports"])
app.include_router(developer_router, prefix="/v1", tags=["developer"])
app.include_router(admin_router, prefix="/v1", tags=["admin"])
