"""Auth / tenant tests (dev-permissive by default)."""

import pytest

from backend.api.auth import create_access_token, decode_token, current_principal
from backend.config import settings


def test_token_round_trip():
    token = create_access_token("acme", "admin", "u1")
    claims = decode_token(token)
    assert claims["tenant_id"] == "acme"
    assert claims["role"] == "admin"


async def test_permissive_when_auth_not_required():
    # Default AUTH_REQUIRED is False -> anonymous public tenant, no token needed.
    assert settings.AUTH_REQUIRED is False
    p = await current_principal(authorization=None)
    assert p.tenant_id == "public"


async def test_bearer_token_sets_tenant():
    token = create_access_token("globex", "analyst")
    p = await current_principal(authorization=f"Bearer {token}")
    assert p.tenant_id == "globex"


async def test_invalid_token_rejected():
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        await current_principal(authorization="Bearer not.a.jwt")
