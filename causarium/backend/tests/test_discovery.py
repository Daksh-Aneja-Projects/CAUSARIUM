"""Discovery-engine and end-to-end pipeline tests (offline, deterministic)."""

import numpy as np

from backend.discovery._stats import kmeans, best_k, bimodality_coefficient
from backend.discovery.attractor import AttractorDetector
from backend.discovery.repeller import RepellerDetector
from backend.discovery.butterfly import ButterflyScanner
from backend.discovery.paradox import ParadoxEngine
from backend.causal.graph_constructor import GraphConstructor
from backend.workers.discovery_worker import DiscoveryWorker
from backend.models.run_result import RunResult


# --------------------------- stats primitives --------------------------- #
def test_kmeans_separates_two_blobs():
    rng = np.random.default_rng(0)
    a = rng.normal(0, 0.1, size=(20, 3))
    b = rng.normal(5, 0.1, size=(20, 3))
    points = np.vstack([a, b])
    labels, centroids = kmeans(points, 2, seed=1)
    # Each blob should be internally consistent (one label dominates each half).
    assert len(set(labels[:20])) == 1
    assert len(set(labels[20:])) == 1
    assert labels[0] != labels[-1]


def test_best_k_prefers_two_for_bimodal():
    rng = np.random.default_rng(1)
    points = np.vstack([rng.normal(0, 0.1, (15, 2)), rng.normal(8, 0.1, (15, 2))])
    k, _, _ = best_k(points, k_max=4, seed=2)
    assert k == 2


def test_bimodality_high_for_two_peaks():
    values = [0.0] * 20 + [1.0] * 20
    assert bimodality_coefficient(values) > 0.555
    assert bimodality_coefficient([0.5] * 40) < 0.555


# --------------------------- engines on fixtures ------------------------ #
def test_pipeline_runs_and_shapes(sample_runs):
    result = DiscoveryWorker().process_simulation(sample_runs, simulation_id="sim-test")
    for key in ["hidden_causal_chains", "attractors", "repellers", "choke_points",
                "butterfly_events", "singularities", "causal_paradoxes", "structural_edges"]:
        assert key in result
        assert isinstance(result[key], list)
    assert result["run_count"] == len(sample_runs)


def test_attractors_have_valid_convergence(sample_runs):
    attractors = AttractorDetector().detect_attractors(sample_runs, "sim-test")
    for a in attractors:
        assert 0.15 < a.convergence_rate <= 1.0
        assert a.member_run_ids
        assert set(a.dna_centroid)  # non-empty centroid
    # convergence rates never exceed 1 in total membership terms
    assert sum(len(a.member_run_ids) for a in attractors) <= len(sample_runs)


def test_repeller_flags_unreachable_target(sample_runs):
    # A synthetic outcome no run reaches must register as a repeller.
    rep = RepellerDetector().detect_repellers("NONEXISTENT_OUTCOME", sample_runs, "sim-test")
    assert rep is not None
    assert rep.achievement_rate == 0.0
    assert rep.structural_blockers


def test_repeller_none_for_common_outcome(sample_runs):
    common = max(
        {r.terminal_outcome for r in sample_runs},
        key=lambda o: sum(1 for r in sample_runs if r.terminal_outcome == o),
    )
    assert RepellerDetector().detect_repellers(common, sample_runs, "sim-test", max_rate=0.05) is None


def test_butterfly_amplification_positive(sample_runs):
    graphs = {r.run_id: GraphConstructor().build_graph(r.events) for r in sample_runs}
    butterflies = ButterflyScanner().scan_butterflies(graphs, "sim-test")
    for b in butterflies:
        assert b.amplification_ratio >= 3.0
        assert b.downstream_causal_weight > 0


def test_paradox_detects_known_cycle():
    import networkx as nx
    g = nx.DiGraph()
    g.add_edge("X:A", "Y:B", weight=0.6)
    g.add_edge("Y:B", "Z:C", weight=0.6)
    g.add_edge("Z:C", "X:A", weight=0.6)
    paradoxes = ParadoxEngine().detect_paradoxes(g, "sim-test")
    assert len(paradoxes) == 1
    assert paradoxes[0].cycle_strength > 0.5
    assert len(paradoxes[0].cycle) == 3


def test_empty_runs_are_safe():
    result = DiscoveryWorker().process_simulation([], simulation_id="sim-empty")
    assert result["run_count"] == 0
    assert result["attractors"] == []
