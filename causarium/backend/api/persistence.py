"""
Best-effort persistence of a completed simulation.

Called from the engine after discovery. Every step degrades gracefully: the
DNA vector index always works (in-memory fallback), and Neo4j writes are skipped
if no server is reachable. Persistence never blocks or fails a simulation.
"""

from typing import Any, Dict

from ..graph.neo4j_client import neo4j_client
from ..graph.qdrant_client import dna_index


def persist_simulation(session) -> Dict[str, Any]:
    result = {"vectors_indexed": 0, "neo4j": False}

    # 1. Index each run's reality DNA for similarity search.
    for run in session.runs:
        dna_index.upsert_dna(
            run.run_id, session.simulation_id, run.reality_dna, run.terminal_outcome or "UNKNOWN"
        )
        result["vectors_indexed"] += 1

    # 2. Write the discovery graph to Neo4j (no-op if unavailable).
    if session.discovery:
        result["neo4j"] = neo4j_client.persist_discovery(session.simulation_id, session.discovery)

    result["vector_backend"] = dna_index.backend
    if session.discovery is not None:
        session.discovery["persistence"] = result
    return result
