"""
Reality-DNA vector index.

Stores each run's 10-dimensional reality-DNA so the platform can answer "which
other timelines behaved like this one?" — the basis for timeline clustering and
cross-simulation similarity search.

Uses a real Qdrant server when one is reachable; otherwise falls back to a
process-local in-memory cosine index so the feature works with zero external
infrastructure. Callers use the same API either way.
"""

from typing import Any, Dict, List, Optional

import numpy as np

from ..config import settings
from .dna_tagger import DNA_DIMENSIONS

COLLECTION = "reality_dna"


def _vec(dna: Dict[str, float]) -> np.ndarray:
    return np.array([float(dna.get(d, 0.0)) for d in DNA_DIMENSIONS], dtype=float)


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


class DNAVectorIndex:
    """Vector index over run DNA, backed by Qdrant when available."""

    def __init__(self, url: Optional[str] = None):
        self.url = url or getattr(settings, "QDRANT_URL", None) or "http://localhost:6333"
        self._backend = "memory"
        self._client = None
        # In-memory store: run_id -> {vector, payload}
        self._store: Dict[str, Dict[str, Any]] = {}
        self._try_qdrant()

    # ------------------------------------------------------------------ #
    def _try_qdrant(self) -> None:
        try:
            from qdrant_client import QdrantClient as _Q
            from qdrant_client.models import Distance, VectorParams

            client = _Q(url=self.url, timeout=1.0)
            # Ensure the collection exists (idempotent).
            existing = [c.name for c in client.get_collections().collections]
            if COLLECTION not in existing:
                client.create_collection(
                    COLLECTION,
                    vectors_config=VectorParams(size=len(DNA_DIMENSIONS), distance=Distance.COSINE),
                )
            self._client = client
            self._backend = "qdrant"
        except Exception:  # noqa: BLE001 - fall back to in-memory
            self._client = None
            self._backend = "memory"

    @property
    def backend(self) -> str:
        return self._backend

    # ------------------------------------------------------------------ #
    def upsert_dna(self, run_id: str, simulation_id: str, dna: Dict[str, float], outcome: str) -> None:
        vector = _vec(dna)
        payload = {"run_id": run_id, "simulation_id": simulation_id, "outcome": outcome}
        self._store[run_id] = {"vector": vector, "payload": payload}
        if self._backend == "qdrant" and self._client is not None:
            try:
                from qdrant_client.models import PointStruct

                self._client.upsert(COLLECTION, points=[PointStruct(
                    id=abs(hash(run_id)) % (2**63),
                    vector=vector.tolist(),
                    payload=payload,
                )])
            except Exception:  # noqa: BLE001 - keep the in-memory copy
                self._backend = "memory"

    def search_similar(
        self, dna: Dict[str, float], limit: int = 8, exclude_sim: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = _vec(dna)
        if self._backend == "qdrant" and self._client is not None:
            try:
                hits = self._client.search(COLLECTION, query_vector=query.tolist(), limit=limit + 5)
                out = []
                for h in hits:
                    p = h.payload or {}
                    if exclude_sim and p.get("simulation_id") == exclude_sim:
                        continue
                    out.append({**p, "similarity": round(float(h.score), 4)})
                return out[:limit]
            except Exception:  # noqa: BLE001 - fall back to memory scan
                pass

        scored = []
        for entry in self._store.values():
            p = entry["payload"]
            if exclude_sim and p.get("simulation_id") == exclude_sim:
                continue
            scored.append({**p, "similarity": round(_cosine(query, entry["vector"]), 4)})
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:limit]

    def count(self) -> int:
        return len(self._store)


# Process-wide singleton so DNA accumulates across simulations.
dna_index = DNAVectorIndex()
