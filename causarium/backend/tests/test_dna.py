"""Reality-DNA and outcome-classification tests."""

from backend.graph.dna_tagger import DNATagger, DNA_DIMENSIONS
from backend.graph.outcome import classify_outcome, OUTCOMES


def _aggressive_log():
    return [
        {"type": "ACTION_EXECUTED", "action_type": "SABOTAGE", "tick": t,
         "status": "SUCCESS", "magnitude": 0.8, "effect_magnitude": 0.6}
        for t in range(10)
    ]


def _cooperative_log():
    return [
        {"type": "ACTION_EXECUTED", "action_type": "COOPERATE", "tick": t,
         "status": "SUCCESS", "magnitude": 0.3, "effect_magnitude": 0.3}
        for t in range(10)
    ]


def test_dna_has_all_dimensions_in_range():
    dna = DNATagger().compute_dna(_aggressive_log(), {})
    assert set(dna) == set(DNA_DIMENSIONS)
    assert all(0.0 <= v <= 1.0 for v in dna.values())


def test_aggressive_log_scores_high_aggression():
    dna = DNATagger().compute_dna(_aggressive_log(), {})
    assert dna["aggression"] > 0.8


def test_cooperative_log_scores_low_aggression():
    dna = DNATagger().compute_dna(_cooperative_log(), {})
    assert dna["aggression"] < 0.2


def test_trust_reflects_terminal_agent_state():
    terminal = {"a": {"trust_network": {"b": 0.8}}, "b": {"trust_network": {"a": 0.6}}}
    dna = DNATagger().compute_dna(_cooperative_log(), terminal)
    assert dna["trust"] > 0.6  # positive trust maps above the 0.5 midpoint


def test_classify_outcome_is_in_vocabulary():
    dna = DNATagger().compute_dna(_aggressive_log(), {})
    outcome = classify_outcome(dna, {})
    assert outcome in OUTCOMES
    assert outcome == "CONFLICT_ESCALATION"


def test_capital_concentration_drives_monopoly():
    dna = {"chaos": 0.0, "fragility": 0.0, "resilience": 1.0, "aggression": 0.1,
           "trust": 0.5, "innovation": 0.0}
    terminal = {"a": {"capital": 100.0}, "b": {"capital": 1.0}, "c": {"capital": 1.0}}
    assert classify_outcome(dna, terminal) == "MONOPOLY_CAPTURE"
