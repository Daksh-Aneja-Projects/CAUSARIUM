"""
Prompt -> bespoke simulation.

Turns ANY natural-language question about the future ("who will win the election",
"who takes the IPL", "where does the stock go", "will the merger clear") into a
concrete multi-agent scenario: the real contenders (possible outcomes) and the key
actors/forces that decide it, each with plausible attributes, plus a fitting lens
and reality physics.

Uses the local Ollama model, optionally grounded by a quick web search. Nothing
about the domain is hardcoded; the model reasons about the specific entities in the
prompt. Falls back to a generic-but-usable scenario if the model is unavailable.
"""

import json
import re
from typing import Any, Dict, List, Optional

from ..config import settings
from ..llm.router import generate_json
from .catalog import LENSES

SCENARIO_SCHEMA = {
    "type": "object",
    "required": ["title", "agents", "contenders"],
    "properties": {
        "title": {"type": "string"},
        "domain": {"type": "string"},
        "question": {"type": "string"},
        "lens_id": {"type": "string"},
        "context": {"type": "string"},
        "constraint_params": {"type": "object"},
        "contenders": {"type": "array", "items": {"type": "string"}},
        "agents": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name"],
                "properties": {
                    "name": {"type": "string"},
                    "role": {"type": "string"},
                    "contender": {"type": "boolean"},
                    "risk_tolerance": {"type": "number"},
                    "ethics_threshold": {"type": "number"},
                    "influence": {"type": "number"},
                    "capital": {"type": "number"},
                },
            },
        },
    },
}

_SYSTEM = """You are a scenario architect for a multi-agent futures simulator. Given a \
user's question about the future, design a simulation that could answer it.

Identify:
1. The real CONTENDERS - the concrete possible answers/winners/outcomes for THIS question \
(e.g. the actual parties, teams, companies, or discrete outcomes). 2 to 5 of them.
2. The key ACTORS and FORCES that decide it (5 to 8) - include the contenders themselves as \
agents plus the forces acting on them (voters, funding, media, regulators, momentum, etc.).
Give each agent plausible attributes in [0,1] (capital in [0,4]): risk_tolerance, \
ethics_threshold, influence, capital. Mark contender agents with "contender": true.
3. The best analysis lens from: risk, strategy, crisis, negotiation, forecast, innovation.
4. Reality physics: entropy_rate [0-1], cascade_coefficient [1-5], black_swan_probability \
[0-0.05], trust_decay_rate [0-1], cooperation_incentive [0.5-2].

Ground everything in what is actually known about the specific entities in the question. \
Be concrete and realistic. Return ONLY the JSON object."""


async def synthesize_scenario(prompt: str, use_web: Optional[bool] = None) -> Dict[str, Any]:
    prompt = (prompt or "").strip()
    if not prompt:
        return _fallback("an unspecified question about the future")

    grounding = ""
    if use_web is None:
        use_web = settings.SCENARIO_WEB_GROUNDING
    if use_web:
        grounding = _web_context(prompt)

    user = f"User question: {prompt}\n"
    if grounding:
        user += f"\nRecent web context (use for grounding, may be noisy):\n{grounding}\n"
    user += "\nDesign the simulation now and return the JSON object."

    if settings.offline:
        return _fallback(prompt)

    try:
        raw = await generate_json(
            [{"role": "system", "content": _SYSTEM}, {"role": "user", "content": user}],
            schema=SCENARIO_SCHEMA, model=settings.LLM_SYNTH_MODEL,
            temperature=0.4, max_tokens=1600,
        )
    except Exception:  # noqa: BLE001
        return _fallback(prompt)

    result = _normalize(raw, prompt)
    # If the model produced nothing usable, fall back but keep the prompt/title.
    if len([a for a in result["population"]]) < 2:
        return _fallback(prompt)
    return result


# --------------------------------------------------------------------------- #
def _name_of(x: Any) -> str:
    if isinstance(x, dict):
        return str(x.get("name") or x.get("id") or x.get("label") or x.get("role") or "Actor")
    return str(x)


def _to_agent(x: Any, contender: bool) -> Optional[Dict[str, Any]]:
    d = x if isinstance(x, dict) else {"name": str(x)}
    name = _name_of(d).strip()[:40]
    if not name or name.lower() in ("actor", "none"):
        return None
    return {
        "agent_type": name, "role": str(d.get("role", "")),
        "contender": bool(d.get("contender", contender)),
        "risk_tolerance": _clamp(d.get("risk_tolerance", 0.55)),
        "ethics_threshold": _clamp(d.get("ethics_threshold", 0.5)),
        "influence": _clamp(d.get("influence", 0.55)),
        "capital": _clamp(d.get("capital", 1.5), 0.0, 4.0),
        "confidence": 0.6,
    }


def _normalize(raw: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    # The model may name the fields differently; accept common variants.
    raw_contenders = raw.get("contenders") or raw.get("outcomes") or []
    actor_lists = (
        raw.get("agents") or raw.get("actors_and_forces") or raw.get("actors")
        or raw.get("actors_forces") or []
    )
    if isinstance(raw.get("forces"), list):
        actor_lists = list(actor_lists) + raw["forces"]

    by_name: Dict[str, Dict[str, Any]] = {}
    contenders: List[str] = []
    for c in raw_contenders:
        a = _to_agent(c, contender=True)
        if a:
            a["contender"] = True
            by_name[a["agent_type"]] = a
            contenders.append(a["agent_type"])
    for x in (actor_lists or []):
        a = _to_agent(x, contender=False)
        if a and a["agent_type"] not in by_name:
            by_name[a["agent_type"]] = a

    agents = list(by_name.values())[:8]
    if len(contenders) < 2:
        contenders = [a["agent_type"] for a in agents if a.get("contender")][:5] or \
            [a["agent_type"] for a in agents[:3]]

    lens_raw = raw.get("lens_id") or raw.get("analysis_lens") or raw.get("lens")
    lens_id = _name_of(lens_raw).lower() if lens_raw else "forecast"
    if lens_id not in LENSES:
        lens_id = "forecast"
    cp = raw.get("constraint_params") or raw.get("reality_physics") or {}
    constraint_params = {
        "entropy_rate": _clamp(cp.get("entropy_rate", 0.35)),
        "cascade_coefficient": _clamp(cp.get("cascade_coefficient", 2.0), 1.0, 5.0),
        "black_swan_probability": _clamp(cp.get("black_swan_probability", 0.03), 0.0, 0.05),
        "trust_decay_rate": _clamp(cp.get("trust_decay_rate", 0.15)),
        "cooperation_incentive": _clamp(cp.get("cooperation_incentive", 1.0), 0.5, 2.0),
    }

    return {
        "title": str(raw.get("title") or prompt)[:80],
        "domain": str(raw.get("domain", "")),
        "question": str(raw.get("question") or prompt),
        "prompt": prompt,
        "lens_id": lens_id,
        "context": str(raw.get("context", "")),
        "contenders": contenders,
        "constraint_params": constraint_params,
        "population": agents,
        "synthesized": True,
    }


def _fallback(prompt: str) -> Dict[str, Any]:
    """A generic but usable scenario when no model is available."""
    return {
        "title": prompt[:80] or "Open question",
        "domain": "General", "question": prompt, "prompt": prompt,
        "lens_id": "forecast", "context":
            "Model unavailable; using a generic contender field. Configure Ollama for a "
            "bespoke, prompt-specific simulation.",
        "contenders": ["Outcome A", "Outcome B", "Outcome C"],
        "constraint_params": {"entropy_rate": 0.35, "cascade_coefficient": 2.0,
                              "black_swan_probability": 0.03, "trust_decay_rate": 0.15,
                              "cooperation_incentive": 1.0},
        "population": [
            {"agent_type": "Outcome A", "role": "contender", "contender": True, "risk_tolerance": 0.6, "ethics_threshold": 0.5, "influence": 0.7, "capital": 2.0, "confidence": 0.6},
            {"agent_type": "Outcome B", "role": "contender", "contender": True, "risk_tolerance": 0.6, "ethics_threshold": 0.5, "influence": 0.6, "capital": 2.0, "confidence": 0.6},
            {"agent_type": "Outcome C", "role": "contender", "contender": True, "risk_tolerance": 0.5, "ethics_threshold": 0.5, "influence": 0.5, "capital": 1.5, "confidence": 0.6},
            {"agent_type": "Momentum", "role": "force", "contender": False, "risk_tolerance": 0.7, "ethics_threshold": 0.5, "influence": 0.6, "capital": 1.0, "confidence": 0.6},
            {"agent_type": "Public Sentiment", "role": "force", "contender": False, "risk_tolerance": 0.5, "ethics_threshold": 0.6, "influence": 0.6, "capital": 1.0, "confidence": 0.6},
        ],
        "synthesized": False,
    }


def _web_context(prompt: str, max_results: int = 5) -> str:
    """Best-effort live web snippets for grounding. Guarded: any failure -> ''."""
    try:
        from ddgs import DDGS  # type: ignore
    except Exception:
        try:
            from duckduckgo_search import DDGS  # type: ignore
        except Exception:
            return ""
    try:
        out = []
        with DDGS() as ddgs:
            for r in ddgs.text(prompt, max_results=max_results):
                title = r.get("title", ""); body = r.get("body", "")
                out.append(f"- {title}: {body}")
        return "\n".join(out)[:1800]
    except Exception:  # noqa: BLE001
        return ""


def _clamp(x: Any, lo: float = 0.0, hi: float = 1.0) -> float:
    try:
        return round(max(lo, min(hi, float(x))), 3)
    except (TypeError, ValueError):
        return lo
