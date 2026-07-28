"""
Causal labeling prompt.

Used by the Causal Discovery Layer to attach a human-legible, semantically
meaningful label and mechanism to a causal chain that was extracted structurally
from the event log. The graph algorithms find *that* A influenced B; this prompt
explains *why*, and classifies the mechanism. Returns STRICT JSON matching
CAUSAL_LABEL_SCHEMA.

Runs at temperature 0 (DEFAULT_CAUSAL_TEMPERATURE) — this is analysis, not
role-play, and must be reproducible.
"""

CAUSAL_LABEL_SYSTEM_PROMPT = """You are the CAUSARIUM Causal Discovery Engine. \
You are given an ordered causal chain that was extracted structurally from a multi-agent \
simulation's event log. Adjacent events are connected because the earlier event materially \
changed the conditions under which the later event occurred.

Your job is to explain the chain, not to re-derive it. Apply causal-inference discipline:
- Distinguish genuine mechanism from mere temporal succession (post hoc is not propter hoc).
- Name the transmission mechanism: how did influence actually flow from cause to effect?
- Note the single most load-bearing link — the edge whose removal would most likely break the chain.

# The causal chain (ordered cause -> effect)
{chain}

# Output contract
Return ONLY a single JSON object, no prose, no markdown fences:
{{
  "label": "<a short, specific title for this chain, <= 8 words>",
  "mechanism": "<one sentence: how influence propagated along the chain>",
  "mechanism_class": "<one of: INCENTIVE, INFORMATION, RESOURCE, TRUST, COERCION, CONTAGION, REGULATORY, TECHNOLOGICAL>",
  "load_bearing_link": "<the 'source -> target' edge most critical to the chain>",
  "confidence": <float 0.0-1.0 that this is a real causal chain, not coincidence>,
  "counterfactual": "<one sentence: what likely happens if the load-bearing link is cut>"
}}"""

CAUSAL_LABEL_USER_PROMPT = (
    "Analyze and label the causal chain above. Return only the JSON object."
)

CAUSAL_LABEL_SCHEMA = {
    "type": "object",
    "required": ["label", "mechanism", "mechanism_class"],
    "properties": {
        "label": {"type": "string"},
        "mechanism": {"type": "string"},
        "mechanism_class": {
            "type": "string",
            "enum": [
                "INCENTIVE", "INFORMATION", "RESOURCE", "TRUST",
                "COERCION", "CONTAGION", "REGULATORY", "TECHNOLOGICAL",
            ],
        },
        "load_bearing_link": {"type": "string"},
        "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
        "counterfactual": {"type": "string"},
    },
}
