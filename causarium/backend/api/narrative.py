"""
Human-readable narration of discovery results.

The discovery engines emit precise but machine-readable findings
(agent_type:action signatures, outcome codes, chain ids). This module turns them
into plain-English sentences an analyst can read at a glance, adapted to the
active lens vocabulary. Purely templated (no LLM) so it is fast and reliable.
"""

from typing import Any, Dict, List, Optional

AGENT_HUMAN = {
    "EXECUTIVE_CEO": "the CEO", "EXECUTIVE_CFO": "the CFO", "EXECUTIVE_CTO": "the CTO",
    "BOARD_DIRECTOR": "the board", "EMPLOYEE_SENIOR": "a senior employee",
    "EMPLOYEE_JUNIOR": "a junior employee", "EMPLOYEE_DISGRUNTLED": "a disgruntled insider",
    "INVESTOR_INSTITUTIONAL": "institutional investors", "INVESTOR_ACTIVIST": "an activist investor",
    "INVESTOR_VC": "a venture investor", "COMPETITOR_DIRECT": "a direct competitor",
    "COMPETITOR_ADJACENT": "an adjacent competitor", "MARKET_MAKER": "the market maker",
    "CUSTOMER_ENTERPRISE": "enterprise customers", "CUSTOMER_CONSUMER": "consumers",
    "CUSTOMER_CHURNED": "churned customers", "SUPPLIER_PRIMARY": "the main supplier",
    "SUPPLIER_BACKUP": "the backup supplier", "REGULATOR_DOMESTIC": "the regulator",
    "REGULATOR_INTERNATIONAL": "international regulators", "GOVERNMENT_MINISTRY": "the government",
    "MEDIA_MAINSTREAM": "mainstream media", "MEDIA_SOCIAL": "social media",
    "ANALYST_FINANCIAL": "financial analysts", "HACKER_STATE": "a state-backed hacker",
    "HACKER_CRIMINAL": "a criminal hacker", "WHISTLEBLOWER": "a whistleblower",
    "AI_SYSTEM_FRIENDLY": "an aligned AI", "AI_SYSTEM_ADVERSARIAL": "an adversarial AI",
    "AUTONOMOUS_AGENT_MARKET": "an autonomous market agent", "EXOGENOUS": "an external shock",
}

ACTION_HUMAN = {
    "COOPERATE": "cooperates", "COMPETE": "competes", "DEFECT": "breaks ranks",
    "NEGOTIATE": "negotiates", "FORM_ALLIANCE": "forms an alliance", "BETRAY": "betrays an ally",
    "INVEST": "invests", "DIVEST": "pulls back", "ACQUIRE": "seizes ground", "HOARD": "hoards resources",
    "COMMUNICATE": "shares information", "BROADCAST": "goes public", "DECEIVE": "spreads disinformation",
    "DISCLOSE": "discloses information", "GATHER_INTEL": "gathers intelligence", "INNOVATE": "innovates",
    "IMITATE": "copies a rival", "SABOTAGE": "sabotages a rival", "ESCALATE": "escalates",
    "DE_ESCALATE": "de-escalates", "REGULATE": "imposes rules", "LOBBY": "lobbies", "WAIT": "holds",
}

SHOCK_HUMAN = {
    "MARKET_CRASH": "a market crash", "REGULATORY_SHOCK": "a regulatory shock",
    "TECH_BREAKTHROUGH": "a technology breakthrough", "SUPPLY_DISRUPTION": "a supply disruption",
    "SCANDAL_LEAK": "a scandal leak", "GEOPOLITICAL_EVENT": "a geopolitical event",
    "INJECTED_CRISIS": "an injected crisis", "INJECTED_SHOCK": "an injected shock",
}

OUTCOME_HUMAN = {
    "SYSTEMIC_COLLAPSE": "systemic collapse", "CONFLICT_ESCALATION": "open conflict",
    "MONOPOLY_CAPTURE": "one player dominating", "DISRUPTIVE_INNOVATION": "disruptive change",
    "STABLE_COOPERATION": "stable cooperation", "FRAGMENTED_STALEMATE": "a fragmented stalemate",
}


def _agent(a: str) -> str:
    return AGENT_HUMAN.get(a, (a or "an actor").replace("_", " ").lower())


def _act(a: str) -> str:
    return ACTION_HUMAN.get(a, SHOCK_HUMAN.get(a, (a or "acts").replace("_", " ").lower()))


def humanize_signature(sig: str) -> str:
    """'MEDIA_SOCIAL:DEFECT' -> 'social media breaks ranks'."""
    agent, _, action = (sig or "").partition(":")
    return f"{_agent(agent)} {_act(action)}"


def _outcome(o: Optional[str], vocab: Dict[str, str]) -> str:
    if not o:
        return "an unclear outcome"
    return vocab.get(o) or OUTCOME_HUMAN.get(o, o.replace("_", " ").lower())


def build_narrative(discovery: Dict[str, Any], lens: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    vocab = (lens or {}).get("outcome_vocab", {}) or {}
    lens_label = (lens or {}).get("label", "strategy")
    runs = discovery.get("run_count", 0)
    dist: Dict[str, int] = discovery.get("outcome_distribution", {}) or {}

    # Headline / executive summary.
    total = sum(dist.values()) or 1
    dominant = max(dist, key=dist.get) if dist else None
    dom_pct = round(100 * dist.get(dominant, 0) / total) if dominant else 0
    chokes = discovery.get("choke_points", [])
    butterflies = discovery.get("butterfly_events", [])

    parts: List[str] = []
    if dominant:
        parts.append(
            f"Across {runs} simulated futures, the most common destination is "
            f"{_outcome(dominant, vocab)} ({dom_pct}% of runs)."
        )
    if chokes:
        c = chokes[0]
        parts.append(
            f"The single best moment to intervene is around step {c['tick']}, "
            f"where action steers {round(c['intervention_efficacy'] * 100)}% of what follows."
        )
    if butterflies:
        b = butterflies[0]
        parts.append(
            f"Watch for small triggers: {narrate_butterfly(b)[0].lower()}{narrate_butterfly(b)[1:]}"
        )
    summary = " ".join(parts) or "The simulation did not produce a decisive pattern."

    return {
        "headline": summary,
        "lens": lens_label,
        "attractors": [narrate_attractor(a, vocab) for a in discovery.get("attractors", [])],
        "choke_points": [narrate_choke(c) for c in chokes],
        "butterfly_events": [narrate_butterfly(b) for b in butterflies],
        "singularities": [narrate_singularity(s) for s in discovery.get("singularities", [])],
        "causal_paradoxes": [narrate_paradox(p) for p in discovery.get("causal_paradoxes", [])],
        "hidden_causal_chains": [narrate_chain(c, vocab) for c in discovery.get("hidden_causal_chains", [])],
    }


def narrate_attractor(a: Dict[str, Any], vocab: Dict[str, str]) -> str:
    label = a.get("label", "")
    outcome = label.replace("Convergence toward ", "").strip()
    pct = round(a.get("convergence_rate", 0) * 100)
    tick = a.get("earliest_deterministic_tick", 0)
    return (f"{pct}% of futures settle into {_outcome(outcome, vocab)}, "
            f"effectively locked in by step {tick}.")


def narrate_choke(c: Dict[str, Any]) -> str:
    return (f"Step {c.get('tick')} is a decisive window: intervening here reshapes "
            f"{round(c.get('intervention_efficacy', 0) * 100)}% of downstream outcomes.")


def narrate_butterfly(b: Dict[str, Any]) -> str:
    label = b.get("event_label", "")
    sig, _, tick = label.partition("@tick")
    amp = b.get("amplification_ratio", 0)
    trigger = humanize_signature(sig.strip())
    step = tick.strip() or "an early step"
    return (f"A moment where {trigger} at step {step} cascaded into "
            f"{amp:.0f}x its size, a small trigger with outsized consequences.")


def narrate_singularity(s: Dict[str, Any]) -> str:
    return (f"Around step {s.get('tick')}, the futures split sharply depending on whether "
            f"{humanize_signature(s.get('decision', ''))}.")


def narrate_paradox(p: Dict[str, Any]) -> str:
    cycle = p.get("cycle", [])
    if not cycle:
        return "A self-reinforcing loop was detected."
    steps = " which drives ".join(humanize_signature(n) for n in cycle[:4])
    return f"A self-reinforcing loop: {steps}, feeding back on itself."


def narrate_chain(c: Dict[str, Any], vocab: Dict[str, str]) -> str:
    events = c.get("events", [])
    if not events:
        return "A causal chain with no readable steps."
    steps = [f"{_agent(e.get('agent_type'))} {_act(e.get('action'))}" for e in events[:4]]
    chain = ", then ".join(steps)
    outcome = _outcome(c.get("terminal_outcome"), vocab)
    freq = round(c.get("frequency", 0) * 100)
    return f"{chain} - a pattern in {freq}% of runs, ending in {outcome}."
