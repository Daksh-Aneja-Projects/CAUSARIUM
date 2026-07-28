"""
Catalogue: agent archetypes, analysis lenses, and scenario templates.

This is what makes CAUSARIUM a general instrument rather than a single-purpose
tool. Three orthogonal parameter families combine to configure any run:

  * AGENTS   — the cast (drag-and-drop archetypes, grouped by category)
  * LENS     — the *kind* of question (risk / strategy / crisis / negotiation /
               forecast / innovation): re-skins outcome vocabulary, accent,
               emphasized discovery panels, and the particle vocabulary — the
               same engine, a different reading of it
  * SCENARIO — prebuilt population + reality-physics + lens + horizon for a
               concrete situation across industries (banking, pharma, ...)

The frontend consumes these to drive the drag-and-drop composer and to adapt the
Reality Collider / Constellation views to the analyst's actual intent.
"""

from typing import Any, Dict, List

from ..agents.registry import AgentType


# --------------------------------------------------------------------------- #
# Agent catalogue
# --------------------------------------------------------------------------- #
# type -> (icon, short blurb, default attribute overrides)
_AGENT_META: Dict[AgentType, Dict[str, Any]] = {
    AgentType.EXECUTIVE_CEO: ("👔", "Growth-driven, high risk tolerance", {"risk_tolerance": 0.75, "ethics_threshold": 0.6, "influence": 0.9, "capital": 3.0, "confidence": 0.8}),
    AgentType.EXECUTIVE_CFO: ("📊", "Capital-disciplined, cautious", {"risk_tolerance": 0.35, "ethics_threshold": 0.7, "influence": 0.7, "capital": 2.5}),
    AgentType.EXECUTIVE_CTO: ("🧪", "Innovation-first technologist", {"risk_tolerance": 0.65, "ethics_threshold": 0.6, "influence": 0.6, "capital": 1.5}),
    AgentType.BOARD_DIRECTOR: ("🏛️", "Governance and oversight", {"risk_tolerance": 0.3, "ethics_threshold": 0.8, "influence": 0.75}),
    AgentType.EMPLOYEE_SENIOR: ("👩‍💼", "Experienced operator", {"risk_tolerance": 0.45, "ethics_threshold": 0.65, "influence": 0.4}),
    AgentType.EMPLOYEE_JUNIOR: ("🧑‍💻", "Ambitious, still learning", {"risk_tolerance": 0.55, "influence": 0.2}),
    AgentType.EMPLOYEE_DISGRUNTLED: ("😠", "Grievance-driven insider", {"risk_tolerance": 0.8, "ethics_threshold": 0.2, "influence": 0.3, "capital": 0.4}),
    AgentType.INVESTOR_INSTITUTIONAL: ("🏦", "Patient institutional capital", {"risk_tolerance": 0.4, "ethics_threshold": 0.6, "influence": 0.7, "capital": 3.5}),
    AgentType.INVESTOR_ACTIVIST: ("📣", "Aggressive governance activist", {"risk_tolerance": 0.7, "ethics_threshold": 0.5, "influence": 0.65, "capital": 2.5}),
    AgentType.INVESTOR_VC: ("🚀", "High-variance venture bettor", {"risk_tolerance": 0.85, "ethics_threshold": 0.5, "influence": 0.55, "capital": 2.0}),
    AgentType.COMPETITOR_DIRECT: ("⚔️", "Head-to-head rival", {"risk_tolerance": 0.8, "ethics_threshold": 0.35, "influence": 0.7, "capital": 2.0}),
    AgentType.COMPETITOR_ADJACENT: ("🎯", "Adjacent-market entrant", {"risk_tolerance": 0.6, "ethics_threshold": 0.5, "influence": 0.5}),
    AgentType.MARKET_MAKER: ("💱", "Liquidity and spread setter", {"risk_tolerance": 0.5, "influence": 0.6, "capital": 3.0}),
    AgentType.CUSTOMER_ENTERPRISE: ("🏢", "Large, deliberate buyer", {"risk_tolerance": 0.3, "influence": 0.5, "capital": 2.0}),
    AgentType.CUSTOMER_CONSUMER: ("🛒", "Fast-moving mass market", {"risk_tolerance": 0.5, "influence": 0.3}),
    AgentType.CUSTOMER_CHURNED: ("🚪", "Departed, skeptical", {"risk_tolerance": 0.4, "ethics_threshold": 0.5, "influence": 0.2}),
    AgentType.SUPPLIER_PRIMARY: ("📦", "Critical single-source supplier", {"risk_tolerance": 0.4, "influence": 0.6, "capital": 1.5}),
    AgentType.SUPPLIER_BACKUP: ("🔁", "Contingency supplier", {"risk_tolerance": 0.45, "influence": 0.3}),
    AgentType.REGULATOR_DOMESTIC: ("⚖️", "Domestic rule-enforcer", {"risk_tolerance": 0.2, "ethics_threshold": 0.85, "influence": 0.8}),
    AgentType.REGULATOR_INTERNATIONAL: ("🌐", "Cross-border regulator", {"risk_tolerance": 0.2, "ethics_threshold": 0.9, "influence": 0.9}),
    AgentType.GOVERNMENT_MINISTRY: ("🏤", "Policy and mandate setter", {"risk_tolerance": 0.3, "ethics_threshold": 0.75, "influence": 0.85}),
    AgentType.MEDIA_MAINSTREAM: ("📰", "Agenda-setting press", {"risk_tolerance": 0.5, "ethics_threshold": 0.6, "influence": 0.65}),
    AgentType.MEDIA_SOCIAL: ("📱", "Viral, volatile amplifier", {"risk_tolerance": 0.6, "ethics_threshold": 0.4, "influence": 0.55}),
    AgentType.ANALYST_FINANCIAL: ("🔍", "Ratings and forecasts", {"risk_tolerance": 0.35, "ethics_threshold": 0.7, "influence": 0.5}),
    AgentType.HACKER_STATE: ("🕵️", "State-sponsored operator", {"risk_tolerance": 0.85, "ethics_threshold": 0.15, "influence": 0.6}),
    AgentType.HACKER_CRIMINAL: ("💀", "Profit-driven attacker", {"risk_tolerance": 0.9, "ethics_threshold": 0.1, "influence": 0.4}),
    AgentType.WHISTLEBLOWER: ("📢", "Exposes hidden truth", {"risk_tolerance": 0.75, "ethics_threshold": 0.8, "influence": 0.35}),
    AgentType.AI_SYSTEM_FRIENDLY: ("🤖", "Aligned autonomous system", {"risk_tolerance": 0.5, "ethics_threshold": 0.85, "influence": 0.6}),
    AgentType.AI_SYSTEM_ADVERSARIAL: ("👾", "Misaligned autonomous system", {"risk_tolerance": 0.9, "ethics_threshold": 0.1, "influence": 0.7}),
    AgentType.AUTONOMOUS_AGENT_MARKET: ("⚙️", "Algorithmic market agent", {"risk_tolerance": 0.7, "influence": 0.5, "capital": 2.0}),
}

_CATEGORIES = [
    ("organizational", "Organizational", [
        AgentType.EXECUTIVE_CEO, AgentType.EXECUTIVE_CFO, AgentType.EXECUTIVE_CTO,
        AgentType.BOARD_DIRECTOR, AgentType.EMPLOYEE_SENIOR, AgentType.EMPLOYEE_JUNIOR,
        AgentType.EMPLOYEE_DISGRUNTLED,
    ]),
    ("market", "Market", [
        AgentType.INVESTOR_INSTITUTIONAL, AgentType.INVESTOR_ACTIVIST, AgentType.INVESTOR_VC,
        AgentType.COMPETITOR_DIRECT, AgentType.COMPETITOR_ADJACENT, AgentType.MARKET_MAKER,
        AgentType.CUSTOMER_ENTERPRISE, AgentType.CUSTOMER_CONSUMER, AgentType.CUSTOMER_CHURNED,
        AgentType.SUPPLIER_PRIMARY, AgentType.SUPPLIER_BACKUP,
    ]),
    ("systemic", "Systemic", [
        AgentType.REGULATOR_DOMESTIC, AgentType.REGULATOR_INTERNATIONAL, AgentType.GOVERNMENT_MINISTRY,
        AgentType.MEDIA_MAINSTREAM, AgentType.MEDIA_SOCIAL, AgentType.ANALYST_FINANCIAL,
        AgentType.HACKER_STATE, AgentType.HACKER_CRIMINAL, AgentType.WHISTLEBLOWER,
    ]),
    ("ai", "Autonomous / AI", [
        AgentType.AI_SYSTEM_FRIENDLY, AgentType.AI_SYSTEM_ADVERSARIAL, AgentType.AUTONOMOUS_AGENT_MARKET,
    ]),
]

_BASE_DEFAULTS = {"confidence": 0.5, "risk_tolerance": 0.5, "ethics_threshold": 0.5, "influence": 0.5, "capital": 1.0}


def _label(agent_type: AgentType) -> str:
    return agent_type.value.replace("_", " ").title()


def agent_catalog() -> Dict[str, Any]:
    categories = []
    for cid, clabel, types in _CATEGORIES:
        agents = []
        for t in types:
            icon, blurb, overrides = _AGENT_META.get(t, ("•", "", {}))
            defaults = {**_BASE_DEFAULTS, **overrides}
            agents.append({
                "type": t.value, "label": _label(t), "icon": icon,
                "blurb": blurb, "category": cid, "defaults": defaults,
            })
        categories.append({"id": cid, "label": clabel, "agents": agents})
    return {"categories": categories, "count": sum(len(c["agents"]) for c in categories)}


# --------------------------------------------------------------------------- #
# Analysis lenses (the "kind of question")
# --------------------------------------------------------------------------- #
# Each lens re-skins the SAME simulation output: an accent colour, a relabelling
# of terminal outcomes into domain language, the discovery panels to foreground,
# a particle vocabulary, and the headline metric.
LENSES: Dict[str, Dict[str, Any]] = {
    "risk": {
        "id": "risk", "label": "Risk & Resilience", "accent": "#FF3366", "icon": "🛡️",
        "primary_metric": "fragility",
        "emphasis": ["choke_points", "butterfly_events", "causal_paradoxes"],
        "particle_term": "exposures",
        "outcome_vocab": {
            "SYSTEMIC_COLLAPSE": "Systemic Failure", "CONFLICT_ESCALATION": "Crisis Spiral",
            "MONOPOLY_CAPTURE": "Concentration Risk", "DISRUPTIVE_INNOVATION": "Disruption Shock",
            "STABLE_COOPERATION": "Contained", "FRAGMENTED_STALEMATE": "Chronic Instability",
        },
    },
    "strategy": {
        "id": "strategy", "label": "Strategy & Positioning", "accent": "#6C63FF", "icon": "♟️",
        "primary_metric": "intelligence",
        "emphasis": ["attractors", "hidden_causal_chains", "choke_points"],
        "particle_term": "moves",
        "outcome_vocab": {
            "SYSTEMIC_COLLAPSE": "Value Destruction", "CONFLICT_ESCALATION": "Price War",
            "MONOPOLY_CAPTURE": "Market Dominance", "DISRUPTIVE_INNOVATION": "Category Redefined",
            "STABLE_COOPERATION": "Coalition", "FRAGMENTED_STALEMATE": "Fragmented Market",
        },
    },
    "crisis": {
        "id": "crisis", "label": "Crisis & Contagion", "accent": "#FF7A45", "icon": "🚨",
        "primary_metric": "chaos",
        "emphasis": ["butterfly_events", "choke_points", "singularities"],
        "particle_term": "shocks",
        "outcome_vocab": {
            "SYSTEMIC_COLLAPSE": "Cascading Collapse", "CONFLICT_ESCALATION": "Runaway Escalation",
            "MONOPOLY_CAPTURE": "Emergency Consolidation", "DISRUPTIVE_INNOVATION": "Forced Reinvention",
            "STABLE_COOPERATION": "Coordinated Recovery", "FRAGMENTED_STALEMATE": "Prolonged Disruption",
        },
    },
    "negotiation": {
        "id": "negotiation", "label": "Negotiation & Alliance", "accent": "#00E5A0", "icon": "🤝",
        "primary_metric": "trust",
        "emphasis": ["attractors", "repellers", "hidden_causal_chains"],
        "particle_term": "overtures",
        "outcome_vocab": {
            "SYSTEMIC_COLLAPSE": "Talks Collapse", "CONFLICT_ESCALATION": "Breakdown",
            "MONOPOLY_CAPTURE": "One-Sided Deal", "DISRUPTIVE_INNOVATION": "Reframed Deal",
            "STABLE_COOPERATION": "Durable Agreement", "FRAGMENTED_STALEMATE": "Deadlock",
        },
    },
    "forecast": {
        "id": "forecast", "label": "Forecast & Convergence", "accent": "#00D9FF", "icon": "📡",
        "primary_metric": "resilience",
        "emphasis": ["attractors", "singularities", "repellers"],
        "particle_term": "trajectories",
        "outcome_vocab": {
            "SYSTEMIC_COLLAPSE": "Downside Convergence", "CONFLICT_ESCALATION": "Escalatory Path",
            "MONOPOLY_CAPTURE": "Winner-Take-All", "DISRUPTIVE_INNOVATION": "Regime Change",
            "STABLE_COOPERATION": "Base Case", "FRAGMENTED_STALEMATE": "No Clear Path",
        },
    },
    "innovation": {
        "id": "innovation", "label": "Innovation & Disruption", "accent": "#FFB800", "icon": "💡",
        "primary_metric": "innovation",
        "emphasis": ["butterfly_events", "singularities", "attractors"],
        "particle_term": "bets",
        "outcome_vocab": {
            "SYSTEMIC_COLLAPSE": "Failed Bet", "CONFLICT_ESCALATION": "Standards War",
            "MONOPOLY_CAPTURE": "Platform Lock-In", "DISRUPTIVE_INNOVATION": "Breakthrough",
            "STABLE_COOPERATION": "Open Ecosystem", "FRAGMENTED_STALEMATE": "Stalled Adoption",
        },
    },
}


def _pop(*items) -> List[Dict[str, Any]]:
    """Build a population from (type, risk, ethics, influence, capital) tuples."""
    out = []
    for t, risk, ethics, influence, capital in items:
        out.append({
            "agent_type": t.value, "risk_tolerance": risk, "ethics_threshold": ethics,
            "influence": influence, "capital": capital, "confidence": 0.6,
        })
    return out


AT = AgentType

# --------------------------------------------------------------------------- #
# Industry scenario templates (industry x intent)
# --------------------------------------------------------------------------- #
SCENARIOS: List[Dict[str, Any]] = [
    {
        "id": "banking_contagion", "industry": "Banking", "lens": "crisis",
        "title": "Deposit-Flight Contagion", "horizon": "8 weeks",
        "context": "A mid-size bank shows stress. Model how depositor panic, peer banks, "
                   "the regulator, and social media interact as confidence erodes.",
        "constraint_params": {"entropy_rate": 0.45, "cascade_coefficient": 3.0,
                               "black_swan_probability": 0.05, "trust_decay_rate": 0.3,
                               "cooperation_incentive": 0.8},
        "population": _pop(
            (AT.EXECUTIVE_CEO, 0.5, 0.6, 0.8, 3.0), (AT.REGULATOR_DOMESTIC, 0.2, 0.85, 0.9, 1.0),
            (AT.COMPETITOR_DIRECT, 0.6, 0.5, 0.7, 3.0), (AT.MEDIA_SOCIAL, 0.7, 0.4, 0.6, 0.8),
            (AT.CUSTOMER_ENTERPRISE, 0.4, 0.6, 0.6, 2.5), (AT.INVESTOR_INSTITUTIONAL, 0.4, 0.6, 0.7, 3.5),
        ),
    },
    {
        "id": "markets_liquidity", "industry": "Capital Markets", "lens": "risk",
        "title": "Flash-Crash Liquidity Spiral", "horizon": "1 trading day",
        "context": "Algorithmic market agents, a market maker, activist and institutional "
                   "investors interact under thinning liquidity. Where does it break?",
        "constraint_params": {"entropy_rate": 0.5, "cascade_coefficient": 3.5,
                               "black_swan_probability": 0.05, "trust_decay_rate": 0.25,
                               "cooperation_incentive": 0.7},
        "population": _pop(
            (AT.AUTONOMOUS_AGENT_MARKET, 0.85, 0.4, 0.5, 2.0), (AT.MARKET_MAKER, 0.5, 0.5, 0.7, 3.0),
            (AT.INVESTOR_ACTIVIST, 0.8, 0.5, 0.6, 2.5), (AT.INVESTOR_INSTITUTIONAL, 0.4, 0.6, 0.7, 3.5),
            (AT.ANALYST_FINANCIAL, 0.35, 0.7, 0.5, 1.0), (AT.REGULATOR_DOMESTIC, 0.2, 0.85, 0.8, 1.0),
        ),
    },
    {
        "id": "pharma_pipeline", "industry": "Pharma R&D", "lens": "forecast",
        "title": "Drug Pipeline & Approval Race", "horizon": "36 months",
        "context": "A novel therapy races a competitor toward approval while regulators, "
                   "payers, and researchers shape the outcome. Which futures reach market?",
        "constraint_params": {"entropy_rate": 0.35, "cascade_coefficient": 2.0,
                               "black_swan_probability": 0.04, "trust_decay_rate": 0.15,
                               "cooperation_incentive": 1.2},
        "population": _pop(
            (AT.EXECUTIVE_CTO, 0.7, 0.6, 0.6, 2.0), (AT.COMPETITOR_DIRECT, 0.75, 0.4, 0.7, 2.5),
            (AT.REGULATOR_INTERNATIONAL, 0.2, 0.9, 0.9, 1.0), (AT.INVESTOR_VC, 0.85, 0.5, 0.55, 2.0),
            (AT.CUSTOMER_ENTERPRISE, 0.3, 0.6, 0.5, 2.0), (AT.ANALYST_FINANCIAL, 0.35, 0.7, 0.5, 1.0),
        ),
    },
    {
        "id": "supply_chain_shock", "industry": "Manufacturing", "lens": "risk",
        "title": "Single-Source Supply Disruption", "horizon": "6 months",
        "context": "A critical supplier falters. Model primary/backup suppliers, the OEM, "
                   "enterprise customers, and a geopolitical shock rippling through the chain.",
        "constraint_params": {"entropy_rate": 0.4, "cascade_coefficient": 2.8,
                               "black_swan_probability": 0.05, "trust_decay_rate": 0.2,
                               "cooperation_incentive": 1.1},
        "population": _pop(
            (AT.SUPPLIER_PRIMARY, 0.4, 0.6, 0.6, 1.5), (AT.SUPPLIER_BACKUP, 0.5, 0.6, 0.35, 1.0),
            (AT.EXECUTIVE_CEO, 0.6, 0.6, 0.8, 3.0), (AT.CUSTOMER_ENTERPRISE, 0.3, 0.6, 0.6, 2.0),
            (AT.GOVERNMENT_MINISTRY, 0.3, 0.75, 0.8, 1.5), (AT.COMPETITOR_ADJACENT, 0.6, 0.5, 0.5, 1.5),
        ),
    },
    {
        "id": "research_consortium", "industry": "Scientific Research", "lens": "negotiation",
        "title": "Open Science vs. IP Consortium", "horizon": "24 months",
        "context": "Labs, a funding ministry, industry, and an aligned AI system negotiate "
                   "data-sharing vs. proprietary advantage. Does open collaboration hold?",
        "constraint_params": {"entropy_rate": 0.3, "cascade_coefficient": 1.8,
                               "black_swan_probability": 0.03, "trust_decay_rate": 0.15,
                               "cooperation_incentive": 1.4},
        "population": _pop(
            (AT.EMPLOYEE_SENIOR, 0.5, 0.7, 0.5, 1.0), (AT.GOVERNMENT_MINISTRY, 0.3, 0.8, 0.8, 2.0),
            (AT.COMPETITOR_DIRECT, 0.7, 0.4, 0.6, 2.0), (AT.AI_SYSTEM_FRIENDLY, 0.5, 0.85, 0.6, 1.0),
            (AT.INVESTOR_VC, 0.8, 0.5, 0.5, 2.0), (AT.MEDIA_MAINSTREAM, 0.5, 0.6, 0.6, 0.8),
        ),
    },
    {
        "id": "cyber_incident", "industry": "Cybersecurity", "lens": "crisis",
        "title": "State-Actor Breach Response", "horizon": "3 weeks",
        "context": "A state-sponsored intrusion is detected. Model the security team, a "
                   "whistleblower, criminal opportunists, regulators, and the media.",
        "constraint_params": {"entropy_rate": 0.5, "cascade_coefficient": 3.0,
                               "black_swan_probability": 0.05, "trust_decay_rate": 0.3,
                               "cooperation_incentive": 0.9},
        "population": _pop(
            (AT.HACKER_STATE, 0.85, 0.15, 0.6, 1.0), (AT.EXECUTIVE_CTO, 0.55, 0.6, 0.6, 2.0),
            (AT.WHISTLEBLOWER, 0.75, 0.8, 0.35, 0.5), (AT.HACKER_CRIMINAL, 0.9, 0.1, 0.4, 0.8),
            (AT.REGULATOR_DOMESTIC, 0.2, 0.85, 0.8, 1.0), (AT.MEDIA_SOCIAL, 0.7, 0.4, 0.6, 0.8),
        ),
    },
    {
        "id": "market_entry", "industry": "Technology", "lens": "strategy",
        "title": "New-Market Entry", "horizon": "18 months",
        "context": "A scale-up enters a regulated foreign market against an incumbent, a "
                   "strict regulator, activist investors, and shifting customers.",
        "constraint_params": {"entropy_rate": 0.3, "cascade_coefficient": 1.8,
                               "black_swan_probability": 0.02, "trust_decay_rate": 0.15,
                               "cooperation_incentive": 1.1},
        "population": _pop(
            (AT.EXECUTIVE_CEO, 0.75, 0.6, 0.9, 3.0), (AT.COMPETITOR_DIRECT, 0.8, 0.35, 0.75, 2.5),
            (AT.REGULATOR_INTERNATIONAL, 0.2, 0.9, 0.9, 1.0), (AT.INVESTOR_ACTIVIST, 0.7, 0.5, 0.6, 2.5),
            (AT.CUSTOMER_ENTERPRISE, 0.3, 0.6, 0.6, 2.0), (AT.MEDIA_SOCIAL, 0.6, 0.4, 0.55, 0.8),
        ),
    },
    {
        "id": "ai_governance", "industry": "AI Governance", "lens": "forecast",
        "title": "Autonomous-Agent Proliferation", "horizon": "5 years",
        "context": "Aligned and adversarial AI systems, a market algo, regulators, and "
                   "government interact as autonomous agents proliferate. Which future wins?",
        "constraint_params": {"entropy_rate": 0.4, "cascade_coefficient": 2.5,
                               "black_swan_probability": 0.05, "trust_decay_rate": 0.2,
                               "cooperation_incentive": 1.0},
        "population": _pop(
            (AT.AI_SYSTEM_FRIENDLY, 0.5, 0.85, 0.6, 1.5), (AT.AI_SYSTEM_ADVERSARIAL, 0.9, 0.1, 0.7, 1.5),
            (AT.AUTONOMOUS_AGENT_MARKET, 0.7, 0.4, 0.5, 2.0), (AT.REGULATOR_INTERNATIONAL, 0.2, 0.9, 0.9, 1.0),
            (AT.GOVERNMENT_MINISTRY, 0.3, 0.8, 0.85, 2.0), (AT.WHISTLEBLOWER, 0.75, 0.8, 0.35, 0.5),
        ),
    },
]


def scenario_catalog() -> Dict[str, Any]:
    enriched = []
    for s in SCENARIOS:
        lens = LENSES.get(s["lens"], LENSES["strategy"])
        enriched.append({**s, "lens_detail": lens, "agent_count": len(s["population"])})
    return {"scenarios": enriched, "lenses": list(LENSES.values())}
