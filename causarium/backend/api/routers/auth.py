"""Auth API - mint dev tokens and inspect the current principal."""

from typing import Any, Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..auth import Principal, create_access_token, current_principal
from ...config import settings

router = APIRouter()


class TokenRequest(BaseModel):
    tenant_id: str = Field("public")
    role: str = Field("analyst")


@router.post("/token")
async def issue_token(payload: TokenRequest) -> Dict[str, Any]:
    """Dev-mode token issuance (no password). In production this would sit behind
    a real identity provider."""
    token = create_access_token(payload.tenant_id, payload.role)
    return {
        "access_token": token, "token_type": "bearer",
        "tenant_id": payload.tenant_id, "role": payload.role,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.get("/me")
async def me(principal: Principal = Depends(current_principal)) -> Dict[str, Any]:
    return {
        "tenant_id": principal.tenant_id, "role": principal.role,
        "subject": principal.subject, "auth_required": settings.AUTH_REQUIRED,
    }
