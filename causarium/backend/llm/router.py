import asyncio
from typing import Any, Dict, List, Optional
import litellm
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure LiteLLM
litellm.drop_params = True

# Default fallback chain
DEFAULT_MODEL = "claude-sonnet-4-6"
FALLBACK_MODEL = "gpt-4o-mini"

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def acompletion_with_retry(*args: Any, **kwargs: Any) -> Any:
    """Wrapper around litellm.acompletion with tenacity retries."""
    try:
        return await litellm.acompletion(*args, **kwargs)
    except Exception as e:
        # Tenacity will retry on exception
        raise e

async def generate_response(
    messages: List[Dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.8,
    max_tokens: int = 1024,
    fallback: bool = True
) -> str:
    """
    Generate an async response from the LLM, with optional fallback.
    """
    models_to_try = [model]
    if fallback and model != FALLBACK_MODEL:
        models_to_try.append(FALLBACK_MODEL)
        
    last_exception = None
    
    for current_model in models_to_try:
        try:
            response = await acompletion_with_retry(
                model=current_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            last_exception = e
            continue
            
    raise RuntimeError(f"All LLM routing attempts failed. Last error: {last_exception}")
