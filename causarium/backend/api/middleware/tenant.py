from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class TenantIsolationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        """
        Extracts tenant information from the authenticated API key and enforces 
        tenant-level data isolation across the request context.
        """
        if request.url.path.startswith("/v1/"):
            api_key = getattr(request.state, "api_key", None)
            if not api_key:
                return JSONResponse({"error": "Missing authentication context for tenant isolation"}, status_code=401)
                
            # Mock mapping API key to tenant_id (Section 19.1)
            tenant_id = f"tenant_{api_key[:8]}"
            request.state.tenant_id = tenant_id
            
            logger.debug(f"Request processed for tenant: {tenant_id}")
            
        response = await call_next(request)
        return response
