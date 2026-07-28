"""DNA vector index, timeline clustering, and Neo4j-degradation tests."""

from backend.graph.qdrant_client import DNAVectorIndex
from backend.graph.neo4j_client import Neo4jClient
from backend.graph.timeline_manager import TimelineManager
from backend.models.run_result import RunResult


def _dna(aggr, trust):
    return {
        "aggression": aggr, "trust": trust, "innovation": 0.2, "risk": 0.5, "chaos": 0.1,
        "adaptability": 0.5, "fragility": 0.3, "resilience": 0.6, "intelligence": 0.5, "entropy": 0.5,
    }


def test_vector_index_similarity_ranks_closest_first():
    idx = DNAVectorIndex()
    idx.upsert_dna("r1", "s1", _dna(0.9, 0.1), "CONFLICT_ESCALATION")
    idx.upsert_dna("r2", "s1", _dna(0.85, 0.15), "CONFLICT_ESCALATION")
    idx.upsert_dna("r3", "s1", _dna(0.1, 0.9), "STABLE_COOPERATION")

    hits = idx.search_similar(_dna(0.9, 0.1), limit=3)
    assert hits[0]["run_id"] == "r1"
    assert hits[0]["similarity"] >= hits[1]["similarity"] >= hits[2]["similarity"]
    assert idx.count() == 3


def test_vector_index_exclude_sim():
    idx = DNAVectorIndex()
    idx.upsert_dna("a", "simA", _dna(0.5, 0.5), "X")
    idx.upsert_dna("b", "simB", _dna(0.5, 0.5), "X")
    hits = idx.search_similar(_dna(0.5, 0.5), exclude_sim="simA")
    assert all(h["simulation_id"] != "simA" for h in hits)


def test_neo4j_degrades_gracefully_without_server():
    # No server on the CI box -> available False, writes are safe no-ops.
    client = Neo4jClient(uri="bolt://127.0.0.1:59999")
    assert client.available is False
    assert client.persist_discovery("sim-x", {"attractors": []}) is False
    assert client.stats() == {"available": False}


def test_timeline_clustering_groups_runs():
    runs = [
        RunResult(run_id=f"r{i}", reality_dna=_dna(0.9 if i % 2 == 0 else 0.1, 0.1 if i % 2 == 0 else 0.9))
        for i in range(8)
    ]
    timelines = TimelineManager().cluster_into_timelines(runs)
    assert timelines
    # Every run assigned exactly once.
    assigned = [rid for ids in timelines.values() for rid in ids]
    assert sorted(assigned) == sorted(r.run_id for r in runs)
