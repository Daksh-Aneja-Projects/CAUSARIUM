# CAUSARIUM — Agentic Causality Engine

> Run thousands of LLM-backed agents in parallel, extract hidden causal chains from
> simulated futures, and identify the intervention windows that change outcomes.

CAUSARIUM is an AI-native **Reality Intelligence** platform. It composes populations of
autonomous agents, runs them forward through a constrained simulation substrate, and then
mines the resulting event logs for the causal structure of *why* futures unfold the way
they do — attractors, choke points, butterfly events, singularities, and paradoxes.

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **Scenario Composer** | Define agents, constraints, and run parameters |
| **Agent Substrate** | Autonomous agents with memory, cognition (perceive → plan → execute → reflect) |
| **Simulation Orchestrator** | Celery-managed parallel runs (up to 500 concurrent) |
| **Causal Discovery Layer** | Extract causal chains + attractors, choke points, butterfly events, singularities, paradoxes |
| **Reality Graph Indexer** | Neo4j property graph + Qdrant vector index |
| **Intervention Layer** | Pause, inject, and run counterfactual comparisons mid-simulation |
| **Reality Report Generator** | PDF outputs via Jinja2 + WeasyPrint |
| **API Gateway** | FastAPI REST + WebSocket streaming |

## Tech Stack

- **Backend:** Python 3.11, FastAPI, LiteLLM (Claude + GPT), Celery, NetworkX, asyncpg
- **Data:** PostgreSQL (events), Redis (cache), Neo4j (graph), Qdrant (vectors)
- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS

## Repository Layout

```
causarium/
├── backend/          # FastAPI app, agents, simulation, causal + discovery engines
│   ├── api/          # Routers, middleware, websocket
│   ├── agents/       # Base agent, registry, cognition, memory
│   ├── simulation/   # Tick engine, world state, constraint physics
│   ├── causal/       # Graph construction, chain building, aggregation
│   ├── discovery/    # Attractor, repeller, choke point, butterfly, singularity, paradox
│   ├── graph/        # Neo4j / Qdrant clients, DNA tagger, timeline manager
│   ├── intervention/ # Pause, inject, counterfactual analysis
│   ├── llm/          # Router + prompt templates
│   └── tests/
├── frontend/         # React 19 scientific-instrument UI
├── deploy/helm/      # Kubernetes chart
└── docker-compose.yml
```

## Getting Started

### Backend

```bash
cd causarium/backend
python -m venv .venv_311
.venv_311/Scripts/activate       # Windows
pip install -r requirements.txt
cp ../.env.example ../.env        # then fill in API keys
uvicorn api.main:app --reload
```

### Frontend

```bash
cd causarium/frontend
npm install
npm run dev
```

### Full stack (Docker)

```bash
cd causarium
docker compose up
```

## Status

Phase 1 scaffold complete. Phase 2 (core simulation physics, causal extraction, and the
six discovery engines) is in active development.

## License

Proprietary — © Daksh Aneja. All rights reserved.
