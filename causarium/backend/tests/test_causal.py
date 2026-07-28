"""Causal extraction tests: graph construction, do-calculus filter, chains."""

import networkx as nx

from backend.causal.extractor import Extractor
from backend.causal.graph_constructor import GraphConstructor
from backend.causal.chain_builder import ChainBuilder
from backend.causal.aggregator import Aggregator


def _events():
    """A small hand-built log with an explicit cascade and a response chain."""
    return [
        {"event_id": "e1", "run_id": "r", "tick": 0, "type": "ACTION_EXECUTED",
         "agent_id": "A", "agent_type": "CEO", "action_type": "SABOTAGE",
         "target": "B", "magnitude": 0.8, "effect_magnitude": 0.7, "status": "SUCCESS",
         "causal_parents": []},
        {"event_id": "e2", "run_id": "r", "tick": 1, "type": "ACTION_EXECUTED",
         "agent_id": "B", "agent_type": "COMPETITOR", "action_type": "BETRAY",
         "target": "A", "magnitude": 0.6, "effect_magnitude": 0.5, "status": "SUCCESS",
         "causal_parents": []},
        {"event_id": "e3", "run_id": "r", "tick": 1, "type": "CASCADE",
         "agent_id": "A", "agent_type": "CEO", "action_type": "SABOTAGE",
         "target": "B", "magnitude": 0.8, "effect_magnitude": 0.9, "status": "SUCCESS",
         "causal_parents": ["e1"]},
        {"event_id": "e4", "run_id": "r", "tick": 2, "type": "ACTION_EXECUTED",
         "agent_id": "A", "agent_type": "CEO", "action_type": "ESCALATE",
         "target": "B", "magnitude": 0.5, "effect_magnitude": 0.4, "status": "SUCCESS",
         "causal_parents": []},
    ]


def test_extractor_drops_noise():
    events = _events() + [
        {"event_id": "n1", "tick": 0, "type": "ACTION_EXECUTED", "action_type": "WAIT",
         "status": "IDLE", "effect_magnitude": 0.0, "causal_parents": []},
    ]
    kept = Extractor().extract_events(events)
    assert all(e.get("action_type") != "WAIT" for e in kept)
    assert len(kept) == 4


def test_build_graph_has_explicit_and_inferred_edges():
    g = GraphConstructor().build_graph(_events())
    assert g.number_of_nodes() == 4
    # explicit cascade edge e1 -> e3
    assert g.has_edge("e1", "e3")
    assert g["e1"]["e3"]["kind"] == "explicit"
    # responsive edge: A sabotaged B (e1), B betrays A next tick (e2)
    assert g.has_edge("e1", "e2")
    assert nx.is_directed_acyclic_graph(g)


def test_do_calculus_filter_requires_multiple_runs():
    gc = GraphConstructor()
    graphs = [gc.build_graph(_events()) for _ in range(3)]
    structural = gc.do_calculus_filter(graphs, min_independent_runs=3)
    # The A:SABOTAGE -> B:BETRAY structural edge recurs in all runs.
    assert structural.number_of_edges() > 0
    for _, _, data in structural.edges(data=True):
        assert data["frequency"] >= 1.0

    # Too few runs -> empty structural graph.
    assert gc.do_calculus_filter(graphs[:2], min_independent_runs=3).number_of_edges() == 0


def test_chain_builder_extracts_ordered_chain():
    g = GraphConstructor().build_graph(_events())
    chains = ChainBuilder().extract_chains(g, run_id="r", simulation_id="s",
                                           terminal_outcome="CONFLICT_ESCALATION")
    assert chains
    top = chains[0]
    assert len(top.events) >= 3
    ticks = [e.tick for e in top.events]
    assert ticks == sorted(ticks)  # causal order respects time
    assert top.causal_weight > 0


def test_aggregator_counts_cross_run_frequency():
    g = GraphConstructor().build_graph(_events())
    per_run = [ChainBuilder().extract_chains(g, run_id=f"r{i}", simulation_id="s") for i in range(4)]
    aggregated = Aggregator().aggregate_chains(per_run, total_runs=4)
    assert aggregated
    # A chain present in every run should have frequency 1.0.
    assert max(c.frequency for c in aggregated) == 1.0
