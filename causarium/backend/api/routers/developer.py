from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/developer", tags=["developer"])


def get_developer_metadata() -> dict[str, object]:
    return {
        "sdk": {
            "python": "pip install causarium-sdk",
            "typescript": "npm install @causarium/sdk",
        },
        "endpoints": {
            "simulations": "/v1/simulations",
            "reports": "/v1/reports/generate",
            "interventions": "/v1/interventions/",
        },
        "notes": "Use the public API to run simulations and retrieve discovery outputs.",
    }


@router.get("/metadata")
def developer_metadata() -> dict[str, object]:
    return get_developer_metadata()
