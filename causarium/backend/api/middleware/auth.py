from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import redis
import os

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
r = redis.Redis.from_url(redis_url, decode_responses=True)

class RateLimitAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow WebSocket upgrades to bypass simple auth check if they handle auth via token param,
        # but for REST API we require Bearer token.
        if request.url.path.startswith("/v1/"):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return JSONResponse({"error": "Unauthorized - Missing Bearer Token"}, status_code=401)
            
            api_key = auth_header.split(" ")[1]
            
            # Rate Limiting: 100 requests / minute
            key = f"rate_limit:{api_key}"
            try:
                requests = r.incr(key)
                if requests == 1:
                    r.expire(key, 60)
                
                if requests > 100:
                    return JSONResponse({"error": "Rate limit exceeded. 100 requests/minute allowed."}, status_code=429)
            except redis.ConnectionError:
                # Fallback if Redis is down
                pass
                
            request.state.api_key = api_key
            
        response = await call_next(request)
        return response
