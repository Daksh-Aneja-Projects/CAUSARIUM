"""
LLM router.

Thin, resilient wrapper over LiteLLM providing:
- an async completion path with tenacity retries and provider fallback,
- a JSON-generation helper that extracts and repairs model output,
- an in-memory response cache,
- a deterministic OFFLINE policy so the whole simulation runs end-to-end in
  dev/CI without any provider API key.
"""

import hashlib
import json
import re
from typing import Any, Dict, List, Optional

import litellm
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import settings
from .cache import llm_cache

# Configure LiteLLM to silently drop unsupported params across providers.
litellm.drop_params = True

DEFAULT_MODEL = settings.LLM_DEFAULT_MODEL
FALLBACK_MODEL = settings.LLM_FALLBACK_MODEL


# --------------------------------------------------------------------------- #
# Live provider path
# --------------------------------------------------------------------------- #
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def acompletion_with_retry(*args: Any, **kwargs: Any) -> Any:
    """litellm.acompletion wrapped in exponential-backoff retries."""
    return await litellm.acompletion(*args, **kwargs)


async def generate_response(
    messages: List[Dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.8,
    max_tokens: int = 1024,
    fallback: bool = True,
    use_cache: bool = True,
) -> str:
    """
    Generate a text response from the LLM.

    In offline mode (no provider key configured, or LLM_OFFLINE_MODE=true) this
    returns a deterministic heuristic string instead of calling any provider.
    """
    if settings.offline:
        return _offline_text(messages)

    cache_kwargs = {"model": model, "temperature": temperature, "max_tokens": max_tokens}
    prompt_key = _messages_key(messages)
    if use_cache:
        cached = await llm_cache.get(prompt_key, cache_kwargs)
        if cached is not None:
            return cached

    models_to_try = [model]
    if fallback and model != FALLBACK_MODEL:
        models_to_try.append(FALLBACK_MODEL)

    last_exception: Optional[Exception] = None
    for current_model in models_to_try:
        try:
            response = await acompletion_with_retry(
                model=current_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content or ""
            if use_cache:
                await llm_cache.set(prompt_key, cache_kwargs, content)
            return content
        except Exception as e:  # noqa: BLE001 - fall through to next model
            last_exception = e
            continue

    raise RuntimeError(f"All LLM routing attempts failed. Last error: {last_exception}")


async def generate_json(
    messages: List[Dict[str, str]],
    schema: Optional[Dict[str, Any]] = None,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    repair: bool = True,
) -> Dict[str, Any]:
    """
    Generate a JSON object from the LLM and return it parsed.

    Robust to models that wrap JSON in prose or ```json fences. If parsing fails
    and ``repair`` is set, one corrective retry is issued. In offline mode a
    deterministic object conforming to ``schema`` is synthesized.
    """
    if settings.offline:
        return _offline_json(messages, schema)

    text = await generate_response(
        messages, model=model, temperature=temperature, max_tokens=max_tokens
    )
    parsed = _extract_json(text)
    if parsed is not None:
        return parsed

    if repair:
        repair_messages = messages + [
            {"role": "assistant", "content": text},
            {
                "role": "user",
                "content": (
                    "Your previous reply was not valid JSON. Reply again with ONLY "
                    "the JSON object, no prose and no markdown fences."
                ),
            },
        ]
        text = await generate_response(
            repair_messages, model=model, temperature=0.0,
            max_tokens=max_tokens, use_cache=False,
        )
        parsed = _extract_json(text)
        if parsed is not None:
            return parsed

    # Last resort: never crash the simulation on a malformed decision.
    return _offline_json(messages, schema)


# --------------------------------------------------------------------------- #
# JSON extraction / repair
# --------------------------------------------------------------------------- #
_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    """Best-effort extraction of a single JSON object from free-form model text."""
    if not text:
        return None

    candidates: List[str] = []
    fence = _FENCE_RE.search(text)
    if fence:
        candidates.append(fence.group(1))
    candidates.append(text)
    # Greedy first-{ to last-} slice as a fallback.
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidates.append(text[start : end + 1])

    for candidate in candidates:
        candidate = candidate.strip()
        if not candidate:
            continue
        try:
            obj = json.loads(candidate)
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            continue
    return None


# --------------------------------------------------------------------------- #
# Offline deterministic policy
# --------------------------------------------------------------------------- #
def _messages_key(messages: List[Dict[str, str]]) -> str:
    return "\n".join(f"{m.get('role')}:{m.get('content')}" for m in messages)


def _seed(messages: List[Dict[str, str]]) -> int:
    """Stable integer seed derived from the prompt (deterministic across runs)."""
    digest = hashlib.sha256(_messages_key(messages).encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _offline_text(messages: List[Dict[str, str]]) -> str:
    """Deterministic plain-text stand-in when no provider is available."""
    return json.dumps(_offline_json(messages, None))


def _offline_json(
    messages: List[Dict[str, str]], schema: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Synthesize a deterministic object that satisfies ``schema``. Detects the
    three CAUSARIUM prompt families by their required fields so offline
    simulations still produce varied, plausible behavior.
    """
    from ..constants import ActionType

    seed = _seed(messages)
    props = (schema or {}).get("properties", {}) if schema else {}

    # --- Agent decision ---------------------------------------------------- #
    if "action_type" in props:
        actions = list(ActionType)
        action = actions[seed % len(actions)]
        magnitude = round(0.2 + ((seed >> 4) % 80) / 100.0, 2)
        return {
            "action_type": action.value,
            "target": "ENVIRONMENT",
            "magnitude": magnitude,
            "rationale": "Offline heuristic decision (no LLM provider configured).",
            "expected_effect": "Deterministic stand-in effect.",
            "confidence": round(0.4 + ((seed >> 8) % 50) / 100.0, 2),
            "ethical_flag": bool((seed >> 3) & 1) and action in
            {ActionType.DECEIVE, ActionType.SABOTAGE, ActionType.BETRAY},
        }

    # --- Reflection -------------------------------------------------------- #
    if "updated_goals" in props or ("summary" in props and "importance" in props):
        return {
            "summary": "Offline heuristic reflection.",
            "patterns": [],
            "insights": [],
            "updated_goals": [],
            "goals_changed": False,
            "importance": (seed % 10) + 1,
            "emotional_state": "neutral",
        }

    # --- Causal label ------------------------------------------------------ #
    if "mechanism_class" in props:
        classes = ["INCENTIVE", "INFORMATION", "RESOURCE", "TRUST",
                   "COERCION", "CONTAGION", "REGULATORY", "TECHNOLOGICAL"]
        return {
            "label": "Offline causal chain",
            "mechanism": "Deterministic offline mechanism label.",
            "mechanism_class": classes[seed % len(classes)],
            "load_bearing_link": "unknown -> unknown",
            "confidence": round(0.5 + (seed % 40) / 100.0, 2),
            "counterfactual": "Offline stand-in counterfactual.",
        }

    # --- Generic ----------------------------------------------------------- #
    return {"offline": True, "seed": seed}
