import json
from typing import Optional, Any
# Using a simple in-memory cache for now. Can be swapped with redis.asyncio

class LLMCache:
    def __init__(self):
        self._cache: dict[str, str] = {}

    def _generate_key(self, prompt: str, kwargs: dict[str, Any]) -> str:
        # Simple hash based on prompt and params
        key_data = {"prompt": prompt, "kwargs": kwargs}
        return str(hash(json.dumps(key_data, sort_keys=True)))

    async def get(self, prompt: str, kwargs: dict[str, Any]) -> Optional[str]:
        key = self._generate_key(prompt, kwargs)
        return self._cache.get(key)

    async def set(self, prompt: str, kwargs: dict[str, Any], response: str) -> None:
        key = self._generate_key(prompt, kwargs)
        self._cache[key] = response

# Global instance
llm_cache = LLMCache()
