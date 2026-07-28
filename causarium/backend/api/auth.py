"""
Authentication and multi-tenant context.

Opt-in and non-breaking: with AUTH_REQUIRED=false (the default for local/dev), any
request is allowed and gets the "public" tenant, so the UI works without tokens.
With AUTH_REQUIRED=true, a valid Bearer JWT is required and its tenant scopes the
request. Tokens are minted by POST /v1/auth/token.
"""

import time
from typing import Any, Dict, Optional

from fastapi import Header, HTTPException
from jose import JWTError, jwt

from ..config import settings


def create_access_token(tenant_id: str, role: str = "analyst", subject: str = "dev") -> str:
    now = int(time.time())
    payload = {
        "sub": subject, "tenant_id": tenant_id, "role": role,
        "iat": now, "exp": now + settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


class Principal:
    def __init__(self, tenant_id: str, role: str, subject: str):
        self.tenant_id = tenant_id
        self.role = role
        self.subject = subject


async def current_principal(authorization: Optional[str] = Header(default=None)) -> Principal:
    """
    FastAPI dependency. Resolves the caller's tenant/role from a Bearer token when
    present. Enforces presence + validity only when AUTH_REQUIRED is set.
    """
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()

    if not token:
        if settings.AUTH_REQUIRED:
            raise HTTPException(status_code=401, detail="Missing bearer token")
        return Principal("public", "analyst", "anonymous")

    try:
        claims = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return Principal(
        claims.get("tenant_id", "public"),
        claims.get("role", "analyst"),
        claims.get("sub", "user"),
    )
