from redis.asyncio import Redis
from causarium.backend.config import settings
from typing import Optional

class RedisClient:
    def __init__(self):
        self.redis: Optional[Redis] = None
        self.uri = settings.REDIS_URL
        
    async def connect(self):
        if not self.redis:
            self.redis = Redis.from_url(self.uri, decode_responses=True)
            
    async def disconnect(self):
        if self.redis:
            await self.redis.close()
            self.redis = None
            
    def get_client(self) -> Redis:
        if not self.redis:
            raise RuntimeError("Redis client is not connected. Call connect() first.")
        return self.redis

redis_client = RedisClient()

def get_redis() -> Redis:
    return redis_client.get_client()
