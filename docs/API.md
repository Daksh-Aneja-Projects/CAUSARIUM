# API Reference

Base URL: `http://localhost:8000`. Interactive docs at `/docs`.

Auth is opt-in. With `AUTH_REQUIRED=false` (default) every endpoint is open and
runs as the `public` tenant. With it enabled, pass `Authorization: Bearer <jwt>`.

## Meta
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness + offline-LLM flag |
| GET | `/` | Service info + endpoint map |

## Catalogue
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/catalog/agents` | Agent archetypes grouped by category (icons, defaults) |
| GET | `/v1/catalog/scenarios` | Industry scenario templates, each with population, physics, lens |
| GET | `/v1/catalog/lenses` | Analysis lenses |

## Simulations
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/simulations` | Create + start a run. Body: `scenario_name, run_count, tick_depth, mode ("heuristic"\|"llm"), constraint_params, population, lens, scenario_id`. Returns `simulation_id`, `websocket_url`. |
| GET | `/v1/simulations` | List simulations |
| GET | `/v1/simulations/{id}` | Status + progress + outcome distribution |
| GET | `/v1/simulations/{id}/discovery` | Full discovery results + narrative (202 until ready) |
| GET | `/v1/simulations/{id}/graph` | Causal node-link graph (structural edges) |
| GET | `/v1/simulations/{id}/similar` | Nearest timelines by reality-DNA (+ vector/Neo4j status) |
| POST | `/v1/simulations/{id}/report` | Generate a Reality Report PDF (streamed) |
| WS | `/v1/simulations/{id}/stream` | Live events: `agents`, `interactions`, `tick`, `run_complete`, `paused`, `resumed`, `injected`, `complete` |

### Mid-run intervention
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/simulations/{id}/pause` | Pause the live run at the next tick |
| POST | `/v1/simulations/{id}/resume` | Resume |
| POST | `/v1/simulations/{id}/inject` | Inject at the next tick. Body: `kind ("SHOCK"\|"AGENT_ATTRIBUTE"\|"CONSTRAINT")`, plus params |
| POST | `/v1/simulations/{id}/intervene` | Counterfactual re-run. Body: `agent_index, attribute, value`. Returns outcome + DNA divergence |

## Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/token` | Dev token issuance. Body: `tenant_id, role` |
| GET | `/v1/auth/me` | Current principal |

## WebSocket event shapes (selected)
```jsonc
{ "type": "agents", "run": 0, "agents": [{ "slot": 0, "type": "EXECUTIVE_CEO" }] }
{ "type": "interactions", "run": 0, "tick": 4,
  "links": [{ "s": 0, "t": 2, "action": "SABOTAGE", "agg": true }] }
{ "type": "tick", "run": 0, "tick": 4, "black_swan": false, "progress": 0.31 }
{ "type": "run_complete", "run": 0, "outcome": "FRAGMENTED_STALEMATE", "dna": { } }
{ "type": "complete", "summary": { } }
```
