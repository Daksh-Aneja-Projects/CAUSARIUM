# CAUSARIUM — Pioneer Product Plan (Futuristic UI + Backend Hardening)

**Goal:** Turn CAUSARIUM into a cinematic "reality-intelligence instrument" usable across
industries (banking, finance, research, pharma, manufacturing, geopolitics), with a
live particle/constellation visualization, a drag-and-drop agent catalogue, industry
scenario templates, real graph/vector persistence, and dev-safe auth/tenancy.

## Design thesis (per frontend-design)
- **Subject world:** parallel futures, causal physics, emergent actors, attractors as
  gravity wells. The hero is a *living simulation*, not a dashboard.
- **Signature element:** the **Reality Collider** — a full-bleed canvas where each run
  emits agent particles that flow/collide and collapse into an **outcome node**; nodes
  accrete into attractor gravity-wells; causal chains draw themselves as filaments.
- **Type:** Space Grotesk (display, technical + characterful) · Inter (body) ·
  JetBrains Mono (data/HUD). Deliberate, not default.
- **Palette:** keep brand (#0A0A0F / #6C63FF / #00D9FF / #FF3366) + a validated
  categorical ramp for the 6 terminal outcomes (identity encoding).
- **Motion:** one orchestrated moment (birth→collision→crystallization), reduced-motion respected.

## Tracks & phases

### Track 1 — Backend
- **B1 Agent catalogue API** — `GET /v1/catalog/agents`: all registry archetypes grouped
  by category with attributes, icon, blurb. Drives drag-and-drop roster.
- **B2 Industry scenario templates** — `GET /v1/catalog/scenarios`: prebuilt populations +
  reality-physics + context for Banking, Capital Markets, Pharma R&D, Manufacturing/Supply
  Chain, Scientific Research, Geopolitics. Makes it useful for every industry out of the box.
- **B3 Real persistence** — start Neo4j + Qdrant via docker-compose; verify DNAVectorIndex
  uses qdrant backend and Neo4j writes land (stats endpoint reflects real nodes).
- **B4 Auth/tenant (dev-safe)** — JWT utils + `POST /v1/auth/token` (dev), tenant tagging on
  sessions; enforcement gated by `AUTH_REQUIRED` so the live UI keeps working.

### Track 2 — Futuristic UI
- **F1 Design system** — Space Grotesk + refreshed tokens + outcome palette (new index.css).
- **F2 Reality Collider** — Canvas 2D particle+node engine driven by the WS stream
  (tick→particle bursts, agent_decision→labeled emitters, black_swan→shockwave,
  run_complete→outcome node flying into its attractor cluster, complete→settle).
- **F3 Composer overhaul** — industry template picker + drag-and-drop agent catalogue →
  live roster with editable attributes; launches into the Collider.
- **F4 Outcome Constellation** — post-run node graph: runs placed by DNA projection,
  clustered into attractors, causal-chain filaments, hover inspector.
- **F5 DNA radar** — 10-axis animated radar replacing flat bars.

## Verification
- Backend: `pytest` green; catalogue/scenario endpoints 200; persistence stats show qdrant
  + neo4j when containers up; auth optional in dev.
- UI: launch → watch particles/nodes; drag agents; pick an industry; discover constellation.
  Screenshot each; no console errors; smooth (rAF, capped particle count).
