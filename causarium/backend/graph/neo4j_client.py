"""
Neo4j Reality Graph client.

Persists discovery output as a property graph:
  (:Simulation)-[:HAS_ATTRACTOR]->(:Attractor)
  (:Simulation)-[:HAS_CHOKE_POINT]->(:ChokePoint)
  (:Simulation)-[:HAS_CHAIN]->(:CausalChain)
  (:Signature)-[:INFLUENCES {weight,frequency}]->(:Signature)   # do-calculus edges

Uses the official neo4j driver when a server is reachable; if not, every method
degrades to a safe no-op so the platform runs without Neo4j installed. Connection
is attempted lazily and cached.
"""

import logging
from typing import Any, Dict, List, Optional

from ..config import settings

logger = logging.getLogger(__name__)


class Neo4jClient:
    def __init__(self, uri: Optional[str] = None, user: str = "neo4j", password: str = "password"):
        self.uri = uri or getattr(settings, "NEO4J_URL", None) or "bolt://localhost:7687"
        self.user = getattr(settings, "NEO4J_USER", None) or user
        self.password = getattr(settings, "NEO4J_PASSWORD", None) or password
        self._driver = None
        self._available: Optional[bool] = None

    # ------------------------------------------------------------------ #
    def _connect(self) -> bool:
        if self._available is not None:
            return self._available
        try:
            from neo4j import GraphDatabase

            self._driver = GraphDatabase.driver(
                self.uri, auth=(self.user, self.password),
                connection_timeout=1.5, max_connection_lifetime=30,
            )
            self._driver.verify_connectivity()
            self._available = True
        except Exception as e:  # noqa: BLE001 - operate without Neo4j
            logger.info("Neo4j unavailable (%s); graph persistence disabled.", type(e).__name__)
            self._available = False
        return self._available

    @property
    def available(self) -> bool:
        return self._connect()

    def close(self) -> None:
        if self._driver is not None:
            self._driver.close()

    # ------------------------------------------------------------------ #
    def persist_discovery(self, simulation_id: str, discovery: Dict[str, Any]) -> bool:
        """Write the discovery results for one simulation. Returns success."""
        if not self._connect():
            return False
        try:
            with self._driver.session() as session:
                session.execute_write(self._write_discovery, simulation_id, discovery)
            return True
        except Exception as e:  # noqa: BLE001
            logger.warning("Neo4j write failed: %s", e)
            return False

    @staticmethod
    def _write_discovery(tx, simulation_id: str, discovery: Dict[str, Any]) -> None:
        tx.run("MERGE (s:Simulation {id: $id})", id=simulation_id)

        for a in discovery.get("attractors", []):
            tx.run(
                """
                MATCH (s:Simulation {id: $sid})
                MERGE (a:Attractor {id: $aid})
                SET a.label = $label, a.convergence_rate = $rate
                MERGE (s)-[:HAS_ATTRACTOR]->(a)
                """,
                sid=simulation_id, aid=f"{simulation_id}:{a['attractor_id']}",
                label=a["label"], rate=a["convergence_rate"],
            )
        for c in discovery.get("choke_points", []):
            tx.run(
                """
                MATCH (s:Simulation {id: $sid})
                MERGE (c:ChokePoint {id: $cid})
                SET c.tick = $tick, c.efficacy = $eff
                MERGE (s)-[:HAS_CHOKE_POINT]->(c)
                """,
                sid=simulation_id, cid=f"{simulation_id}:{c['choke_point_id']}",
                tick=c["tick"], eff=c["intervention_efficacy"],
            )
        for ch in discovery.get("hidden_causal_chains", [])[:20]:
            tx.run(
                """
                MATCH (s:Simulation {id: $sid})
                MERGE (c:CausalChain {id: $cid})
                SET c.weight = $w, c.frequency = $f, c.outcome = $o
                MERGE (s)-[:HAS_CHAIN]->(c)
                """,
                sid=simulation_id, cid=f"{simulation_id}:{ch['chain_id']}",
                w=ch["causal_weight"], f=ch["frequency"], o=ch["terminal_outcome"],
            )
        for e in discovery.get("structural_edges", []):
            tx.run(
                """
                MERGE (u:Signature {name: $src})
                MERGE (v:Signature {name: $dst})
                MERGE (u)-[r:INFLUENCES]->(v)
                SET r.weight = $w, r.frequency = $f
                """,
                src=e["source"], dst=e["target"],
                w=e.get("weight", 0.0), f=e.get("frequency", 0.0),
            )

    def stats(self) -> Dict[str, Any]:
        if not self._connect():
            return {"available": False}
        try:
            with self._driver.session() as session:
                n = session.run("MATCH (n) RETURN count(n) AS c").single()["c"]
                r = session.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]
            return {"available": True, "nodes": n, "relationships": r}
        except Exception:  # noqa: BLE001
            return {"available": False}


# Process-wide singleton.
neo4j_client = Neo4jClient()
