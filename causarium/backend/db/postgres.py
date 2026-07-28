import asyncpg
from typing import Optional
from causarium.backend.config import settings

class PostgresClient:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.uri = settings.POSTGRES_URL

    async def connect(self):
        if not self.pool:
            self.pool = await asyncpg.create_pool(dsn=self.uri, min_size=5, max_size=20)
            
    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            self.pool = None

    async def get_connection(self):
        if not self.pool:
            await self.connect()
        return self.pool.acquire()

postgres_client = PostgresClient()

async def get_db_pool() -> asyncpg.Pool:
    if not postgres_client.pool:
        await postgres_client.connect()
    return postgres_client.pool
