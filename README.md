<div align="center">

# CAUSARIUM

### An Agentic Causality Engine for Reality Intelligence

Run thousands of LLM-capable agents through parallel futures, then mine the
resulting timelines for the hidden causal structure that decides how things
actually unfold, attractors, choke points, butterfly events, singularities, and
paradoxes, and see it all live.

</div>

---

## What it does

CAUSARIUM is a flight simulator for the future. Instead of predicting a single
outcome, it simulates a scenario thousands of times with populations of
autonomous agents, then extracts *why* the futures unfold the way they do and
*where you can still change them*.

1. **Compose** a scenario: pick an industry template or drag agent archetypes
   into a roster, choose an analysis lens, and set the reality physics.
2. **Collide**: watch a live force-directed network of the actual agents interact
   tick by tick as thousands of parallel timelines are generated.
3. **Discover**: read a plain-English brief of what happened, backed by six
   discovery engines, a 10-dimensional reality-DNA fingerprint, a constellation
   of futures, and cross-simulation similarity search.
4. **Intervene**: pause a live run and inject a shock, or run counterfactuals to
   measure how a single change reshapes the distribution of futures.

## Highlights

- **Live agent-interaction network** rendered on canvas, driven entirely by the
  streamed simulation (nothing hardcoded).
- **Analysis lenses** (risk, strategy, crisis, negotiation, forecast, innovation)
  that re-skin every view, vocabulary, accent, and emphasized findings, to the
  question being asked.
- **Industry scenario templates**: banking, capital markets, pharma R&D,
  manufacturing, scientific research, cybersecurity, technology, AI governance.
- **Human-readable discovery**: findings are narrated in plain English, not codes.
- **Six discovery engines**: attractors (k-means over reality-DNA), repellers,
  temporal choke points, butterfly events, singularities (bimodality), and causal
  paradoxes, over a do-calculus-filtered causal graph.
- **Local-first LLMs** via Ollama; a fast deterministic heuristic mode needs no LLM.
- **Persistence**: Neo4j reality graph + Qdrant DNA-vector similarity (both with
  in-memory fallbacks so nothing is required to run).
- **Mid-run pause / inject / branch** and counterfactual comparison.

## Tech stack

- **Backend**: Python 3.11, FastAPI, WebSockets, NetworkX, NumPy, LiteLLM (Ollama),
  Neo4j, Qdrant, xhtml2pdf.
- **Frontend**: React 19, TypeScript, Vite, Tailwind v4, Canvas 2D + SVG (no chart libs).

## Quick start

### 1. LLMs (optional, local)
The default heuristic mode needs no LLM. For agent-reasoning mode, run
[Ollama](https://ollama.com) locally and pull a small model:
```bash
ollama pull llama3.1:8b
```

### 2. Databases (optional)
Persistence falls back to in-memory if these are absent. To enable the real
Neo4j + Qdrant backends:
```bash
cd causarium
docker compose up -d neo4j qdrant
```

### 3. Backend
```bash
cd causarium/backend
python -m venv .venv_311 && .venv_311/Scripts/activate   # Windows
pip install -r requirements.txt
uvicorn backend.api.main:app --app-dir .. --port 8000
```

### 4. Frontend
```bash
cd causarium/frontend
npm install
npm run dev            # http://localhost:5173 (proxies /v1 to :8000)
```

Open http://localhost:5173, pick a scenario, and Initiate Reality Collision.

## Repository layout

```
causarium/
  backend/
    api/        FastAPI app, engine, routers, catalog, lenses, narrative, auth
    agents/     Base agent, registry, cognition (perceive/plan/execute/reflect), memory
    simulation/ Tick engine, world state, constraint physics, scenario + LLM runners
    causal/     Graph construction, do-calculus filter, chain building, aggregation
    discovery/  Attractor, repeller, choke-point, butterfly, singularity, paradox
    graph/      DNA tagger, outcome classifier, Neo4j + Qdrant clients, timelines
    intervention/ Pause, inject, counterfactual
    llm/        Router (Ollama) + prompt templates
    tests/
  frontend/     React 19 UI (composer, live collider, discovery, constellation)
  deploy/helm/  Kubernetes chart
  docker-compose.yml
docs/           Architecture + API reference
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/API.md`](docs/API.md).

## Tests

```bash
cd causarium && python -m pytest -q      # backend (offline, deterministic)
cd causarium/frontend && npx tsc --noEmit # frontend typecheck
```

## License

Proprietary. Copyright Daksh Aneja. All rights reserved.
