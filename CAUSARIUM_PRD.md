# CAUSARIUM
## Product Requirements Document
### Agentic Causality Engine — Reality Intelligence Platform
**Version:** 1.0.0  
**Status:** Active  
**Classification:** Confidential  
**Owner:** Daksh Aneja  
**Last Updated:** July 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision](#3-product-vision)
4. [Goals and Success Metrics](#4-goals-and-success-metrics)
5. [Target Users and Personas](#5-target-users-and-personas)
6. [System Architecture](#6-system-architecture)
7. [Core Modules](#7-core-modules)
8. [Agent Design Specification](#8-agent-design-specification)
9. [Simulation Engine](#9-simulation-engine)
10. [Causal Discovery Layer](#10-causal-discovery-layer)
11. [Reality Graph and Indexer](#11-reality-graph-and-indexer)
12. [Discovery Engine — Feature Specifications](#12-discovery-engine--feature-specifications)
13. [Intervention Layer](#13-intervention-layer)
14. [Reality DNA System](#14-reality-dna-system)
15. [API Specification](#15-api-specification)
16. [Data Models](#16-data-models)
17. [UI/UX Requirements](#17-uiux-requirements)
18. [Infrastructure and Scalability](#18-infrastructure-and-scalability)
19. [Security and Compliance](#19-security-and-compliance)
20. [Technology Stack](#20-technology-stack)
21. [Phased Delivery Roadmap](#21-phased-delivery-roadmap)
22. [Risks and Mitigations](#22-risks-and-mitigations)
23. [Open Questions](#23-open-questions)

---

## 1. Executive Summary

CAUSARIUM is a production-grade **Agentic Causality Engine** — a platform that runs thousands of AI-powered autonomous agents in parallel, simulates their interactions across hundreds of possible futures, and surfaces the hidden causal structures, tipping points, and intervention windows that no human analyst or traditional model can discover.

It does not predict. It does not optimize within existing data. It **discovers the shape of futures that have not yet happened.**

CAUSARIUM occupies an uncontested category. Palantir AIP operates on your internal operational data. Alembic optimizes financial scenarios from structured inputs. RAND and McKinsey run human-authored static scenarios. None of them run living, emergent, multi-actor simulations where outcomes are not programmed — they arise.

CAUSARIUM's primary moat is a **compounding causal knowledge graph**: every simulation enriches a proprietary dataset of causal relationships between agent types, incentive structures, and emergent outcomes. The platform becomes more accurate with every run, creating a permanent structural advantage that no competitor can replicate by building later.

**Target verticals at launch:**
- Enterprise Strategic Intelligence (Fortune 500 Chief Strategy Offices)
- Defense and National Security (Wargaming, Theater-Level Doctrine)
- Government and Policy (Central Banks, Regulatory Bodies, Finance Ministries)

---

## 2. Problem Statement

### 2.1 The World Has Become Too Connected to Model Linearly

Modern strategic decisions do not play out in closed systems. A budget cut triggers burnout. Burnout collapses innovation velocity. A competitor, sensing the gap, accelerates. Investors pull back. The company cuts further. The spiral was never visible in the original budget model. It emerged from the interaction of actors with conflicting incentives who each behaved rationally in isolation.

Traditional decision support tools — scenario planning decks, Excel models, consultant frameworks, predictive analytics — share one fatal flaw: **they require humans to pre-specify what matters.** Humans cannot pre-specify what they cannot imagine. Black swans are not rare. They are the normal outputs of complex adaptive systems that no static model captures.

### 2.2 The Existing Solutions Are Structurally Inadequate

| Tool Type | Core Limitation |
|---|---|
| Predictive analytics | Extrapolates from historical patterns. Cannot model novel futures |
| Digital twins | Models physical or financial systems. Cannot model human actor behavior |
| Scenario planning | Human-authored. Anchored in analyst assumptions. Does not scale |
| Wargaming | Expert-led. Expensive, slow, non-repeatable, outputs are opinions |
| Causal AI (Alembic, Causify) | Structured financial data only. No emergence. No actor simulation |
| Palantir AIP | Internal operational intelligence. Does not model the external world |

### 2.3 The Opportunity

The technology inflection point has arrived simultaneously on three fronts:

1. LLM-backed multi-agent simulations with genuine emergent behavior are scientifically validated and technically feasible at scale (AgentScope, OASIS, AgentSociety — thousands to millions of agents)
2. Causal AI is the architectural mandate of 2026 — 70% of enterprise AI teams plan to adopt causal reasoning capability within the year
3. Autonomous agent orchestration frameworks (LangGraph, AutoGen) have matured enough to support production-grade multi-agent deployment

The category-defining platform for **Reality Intelligence** does not yet exist. CAUSARIUM builds it.

---

## 3. Product Vision

> CAUSARIUM is the world's first Agentic Causality Engine — a platform that runs the world before you have to live in it.

**To a CEO:** It runs the world before you have to live in it.  
**To a CTO:** A multi-agent emergent simulation engine with a causal discovery layer on top.  
**To an investor:** The first platform that doesn't predict the future — it explores it.  
**To a defense buyer:** A wargaming engine where the adversaries aren't scripted.

### 3.1 Core Philosophy

Reality is not a single timeline. It is an enormous graph. Every decision creates millions of invisible futures. Humans experience only one. CAUSARIUM experiences all of them — and identifies which ones matter, why they converge, and where the leverage points are.

CAUSARIUM does not answer the question: *"What will happen?"*

It answers: *"What keeps happening across all possible worlds — and what small action changes that?"*

---

## 4. Goals and Success Metrics

### 4.1 Business Goals

| Goal | Metric | Target (Month 12) |
|---|---|---|
| Platform validation | Paying enterprise customers | 5 |
| Revenue | ARR | $2M |
| Technical credibility | Concurrent simulations supported | 500+ |
| Simulation quality | Emergent outcomes not pre-programmed (%) | >80% |
| Decision impact | Customer decisions directly influenced by CAUSARIUM output | 15+ |
| Platform velocity | Simulation runs completed | 10,000+ |

### 4.2 Product Health Metrics

| Metric | Description | Target |
|---|---|---|
| Time to First Insight | Time from scenario input to first Discovery Engine output | < 30 minutes |
| Agent Behavioral Authenticity | % of agent decisions that pass human expert review as plausible | > 85% |
| Causal Accuracy | Hidden causal chains later validated by real-world outcomes | > 60% over 6 months |
| Reality Graph Coverage | Unique causal relationships indexed in the knowledge graph | 500K+ by Month 6 |
| API Latency (P95) | Core simulation API response time | < 200ms |
| Platform Uptime | Availability SLA | 99.5% |

---

## 5. Target Users and Personas

### Persona 1: The Chief Strategy Officer

**Name:** Alexandra  
**Organization:** Fortune 500, $10B+ revenue  
**Pain:** Has a 60-person strategy team producing 300-page scenario reports that are obsolete before they're presented. Board wants answers in days, not quarters. M&A targets, new market entries, competitive responses — all require foresight she doesn't have infrastructure to generate.  
**How she uses CAUSARIUM:** Initiates a Reality Collision before any major strategic decision. Uses Attractor outputs to brief the board. Uses Temporal Choke Point outputs to sequence the execution plan.  
**What she pays:** $250K–$500K ACV enterprise license.

### Persona 2: The Defense Wargame Director

**Name:** Colonel Rajan  
**Organization:** Ministry of Defence / Strategic Command  
**Pain:** Wargames are 3-day manual exercises run by 40 expert analysts at a cost of $2M per exercise. Outputs are opinion, not computation. The adversary's decision tree is whatever the red team player decided to do that day. Non-repeatable, non-scalable.  
**How he uses CAUSARIUM:** Runs theater-level adversarial simulations with autonomous agent-based adversaries. Generates 500 parallel runs. Uses Decision Singularity outputs to identify the 3 decision points where doctrine matters most.  
**What he pays:** $1M–$5M government contract. Air-gapped deployment.

### Persona 3: The Central Bank Scenario Modeler

**Name:** Dr. Priya  
**Organization:** Reserve Bank / Finance Ministry  
**Pain:** Traditional DSGE (Dynamic Stochastic General Equilibrium) models can't capture behavioral dynamics — how bank runs propagate through social networks, how regulatory announcements change investor psychology, how geopolitical shocks cascade into consumer behavior. Her models missed 2008. She needs something that doesn't.  
**How she uses CAUSARIUM:** Runs macro-economic scenario simulations with heterogeneous agent populations (households, banks, hedge funds, regulators, media). Uses Hidden Causal Chain outputs to identify systemic risk cascades before they materialize.  
**What she pays:** $500K–$1.5M government procurement.

### Persona 4: The Platform Developer (API User)

**Name:** Aryan  
**Organization:** AI startup building on top of CAUSARIUM  
**Pain:** Wants to build specialized vertical applications (supply chain risk, political intelligence, climate policy modeling) without building the simulation infrastructure from scratch.  
**How he uses CAUSARIUM:** API-first access. Defines custom agent templates and scenario parameters. Pulls Discovery Engine outputs programmatically. Builds branded applications on top of the CAUSARIUM engine.  
**What he pays:** $50K–$150K/year developer license plus usage-based compute.

---

## 6. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CAUSARIUM PLATFORM                           │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │  Scenario    │    │   Agent      │    │   Simulation         │   │
│  │  Composer    │───▶│   Substrate  │───▶│   Orchestrator       │   │
│  │  (UI + API)  │    │   Layer      │    │   (Parallel Runs)    │   │
│  └──────────────┘    └──────────────┘    └──────────┬───────────┘   │
│                                                       │               │
│  ┌──────────────────────────────────────────────────▼───────────┐   │
│  │                    CAUSAL DISCOVERY ENGINE                    │   │
│  │   Hidden Chain    Attractor    Repeller    Choke Point        │   │
│  │   Detector        Mapper       Mapper      Detector           │   │
│  │   Butterfly       Singularity  Paradox                        │   │
│  │   Scanner         Finder       Engine                         │   │
│  └──────────────────────────────────┬────────────────────────────┘   │
│                                      │                               │
│  ┌──────────────────────────────────▼────────────────────────────┐  │
│  │                      REALITY GRAPH INDEXER                     │  │
│  │   Graph DB (Neo4j)   Vector Index   DNA Tagger   Timeline DB  │  │
│  └──────────────────────────────────┬────────────────────────────┘  │
│                                      │                               │
│  ┌──────────────────────────────────▼────────────────────────────┐  │
│  │                    INTERVENTION LAYER                           │  │
│  │   Pause Engine   Variable Injector   Outcome Re-Router         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │  Reality     │    │  API Gateway │    │  Auth / RBAC /       │   │
│  │  Report Gen  │    │  (REST+WS)   │    │  Deployment Mgr      │   │
│  └──────────────┘    └──────────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.1 Architecture Principles

- **Stateless Simulation Workers:** Each simulation run is an isolated, stateless worker. Runs are horizontally scalable with no shared state between agents across runs.
- **Event-Sourced Agent Memory:** All agent actions are events written to an append-only log. This enables causal replay, counterfactual analysis, and full auditability.
- **Graph-First Data Model:** All outputs — causal chains, attractor states, agent interactions — are written to a property graph database. No SQL for simulation outputs.
- **Async-First API:** All simulation runs are async. Clients subscribe to a run ID and receive streamed updates via WebSocket.
- **Pluggable LLM Backend:** The agent substrate is LLM-agnostic. Swappable between OpenAI, Anthropic, Mistral, or local models (for air-gapped defense deployment).

---

## 7. Core Modules

| Module | Responsibility | Key Dependencies |
|---|---|---|
| **Scenario Composer** | User interface for defining simulation parameters, actor configurations, scenario context | FastAPI, React |
| **Agent Substrate Layer** | LLM-backed agent instantiation, memory management, personality encoding | LangGraph, pgvector, Redis |
| **Simulation Orchestrator** | Parallel run management, agent-to-agent message routing, tick management | Celery, RabbitMQ, Kubernetes |
| **Causal Discovery Engine** | Post-run causal chain extraction, attractor mapping, singularity detection | CAMO-style causal inference, NetworkX, pgvector |
| **Reality Graph Indexer** | Graph storage, DNA tagging, timeline branching, cross-run indexing | Neo4j, Qdrant |
| **Intervention Layer** | Mid-run pause, variable injection, counterfactual re-routing | WebSocket, Simulation Orchestrator |
| **Reality Report Generator** | Auto-generated structured outputs from Discovery Engine results | Jinja2, WeasyPrint, OpenAI |
| **API Gateway** | External REST and WebSocket API for all platform functions | FastAPI, Kong |
| **Auth / RBAC** | Multi-tenant authentication, role-based access, deployment configuration | JWT, OAuth2, Casbin |

---

## 8. Agent Design Specification

### 8.1 Agent Architecture

Each agent in CAUSARIUM is an autonomous LLM-backed entity with the following cognitive architecture, inspired by the Stanford Generative Agents framework and extended for enterprise decision-making contexts:

```
┌────────────────────────────────────────────────────┐
│                    CAUSARIUM AGENT                  │
│                                                     │
│  ┌─────────────┐   ┌─────────────────────────┐    │
│  │  Persona    │   │     Memory Stream        │    │
│  │  Encoding   │   │  (Episodic + Semantic)   │    │
│  └─────────────┘   └────────────┬────────────┘    │
│                                  │                  │
│  ┌─────────────┐   ┌────────────▼────────────┐    │
│  │  Goal Stack │   │     Reflection Engine    │    │
│  │  (Priority  │   │  (Periodic summarize +   │    │
│  │   Ordered)  │   │   importance scoring)    │    │
│  └──────┬──────┘   └────────────┬────────────┘    │
│         │                        │                  │
│  ┌──────▼────────────────────────▼────────────┐   │
│  │              Decision Engine                │   │
│  │   Perceive → Plan → Execute → Observe       │   │
│  └──────────────────────┬─────────────────────┘   │
│                          │                          │
│  ┌───────────────────────▼─────────────────────┐  │
│  │           Interaction Interface               │  │
│  │   Broadcast / Address / Respond / Observe    │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### 8.2 Agent Attributes

Every agent instance carries the following attribute set, configured at instantiation:

**Identity Attributes**
- `agent_id`: UUID
- `agent_type`: Enum (see 8.3)
- `persona_name`: String (human-readable label)
- `organization`: String (affiliated entity)

**Cognitive Attributes**
- `confidence`: Float [0–1] — how certain the agent is in its current model of the world
- `risk_tolerance`: Float [0–1] — willingness to take actions with uncertain outcomes
- `trust_network`: Dict[agent_id → Float] — trust scores toward other agents, dynamically updated
- `knowledge_state`: Vector — embedding of what the agent currently believes to be true
- `bias_profile`: Dict — cognitive biases encoded as probability modifiers on decision outputs
- `ethics_threshold`: Float — threshold below which the agent refuses certain action classes

**Resource Attributes**
- `capital`: Float — financial resources available
- `influence`: Float — social/political leverage
- `information_access`: Enum (LOW / MEDIUM / HIGH / CLASSIFIED)
- `network_reach`: Int — number of agents this agent can directly communicate with per tick

**Behavioral Attributes**
- `adaptation_rate`: Float — how quickly the agent updates its beliefs in response to new information
- `memory_decay`: Float — rate at which older memories reduce in retrieval salience
- `goal_persistence`: Float — how long the agent pursues a goal before abandoning or revising it

### 8.3 Agent Type Registry

CAUSARIUM ships with a default agent type library. All types are extensible and user-configurable.

**Organizational Actors**
- `EXECUTIVE_CEO`, `EXECUTIVE_CFO`, `EXECUTIVE_CTO`, `BOARD_DIRECTOR`
- `EMPLOYEE_SENIOR`, `EMPLOYEE_JUNIOR`, `EMPLOYEE_DISGRUNTLED`
- `INVESTOR_INSTITUTIONAL`, `INVESTOR_ACTIVIST`, `INVESTOR_VC`

**Market Actors**
- `COMPETITOR_DIRECT`, `COMPETITOR_ADJACENT`, `MARKET_MAKER`
- `CUSTOMER_ENTERPRISE`, `CUSTOMER_CONSUMER`, `CUSTOMER_CHURNED`
- `SUPPLIER_PRIMARY`, `SUPPLIER_BACKUP`

**Systemic Actors**
- `REGULATOR_DOMESTIC`, `REGULATOR_INTERNATIONAL`, `GOVERNMENT_MINISTRY`
- `MEDIA_MAINSTREAM`, `MEDIA_SOCIAL`, `ANALYST_FINANCIAL`
- `HACKER_STATE`, `HACKER_CRIMINAL`, `WHISTLEBLOWER`

**AI Actors** (unique to CAUSARIUM)
- `AI_SYSTEM_FRIENDLY`, `AI_SYSTEM_ADVERSARIAL`, `AUTONOMOUS_AGENT_MARKET`

### 8.4 Agent Memory Architecture

```
Memory Stream (Append-Only Event Log)
├── Observations       [what the agent perceived this tick]
├── Actions Taken      [what the agent did this tick]
├── Received Messages  [communications from other agents]
└── World State Snapshot [agent's belief about world at this tick]

Reflection Buffer (Periodic — every N ticks)
├── Importance Scorer  [which memories are most relevant to current goals]
├── Pattern Extractor  [what recurring dynamics has the agent noticed]
└── Goal Updater       [are current goals still valid given new information]

Retrieval Engine
├── Semantic Search    [find relevant memories by meaning, via pgvector]
├── Recency Weighting  [recent memories score higher]
└── Importance Weighting [high-importance memories score higher]
```

---

## 9. Simulation Engine

### 9.1 Simulation Lifecycle

```
1. SCENARIO INGEST
   User defines: context, actor roster, initial conditions, 
   constraint parameters, run count, tick depth

2. WORLD INITIALIZATION
   Agents instantiated with configured attributes
   Initial world state established
   Trust networks seeded
   Resource distributions assigned

3. TICK LOOP (per simulation run)
   ┌─────────────────────────────────────┐
   │  TICK N                              │
   │  1. World state broadcast to all    │
   │     agents                          │
   │  2. Each agent:                     │
   │     a. Perceives world state        │
   │     b. Retrieves relevant memories  │
   │     c. Reflects (if N % R == 0)     │
   │     d. Plans next actions           │
   │     e. Executes actions             │
   │  3. Action resolution engine        │
   │     resolves conflicts              │
   │  4. World state updated             │
   │  5. All events appended to log      │
   │  6. Tick N+1                        │
   └─────────────────────────────────────┘

4. TERMINATION
   Triggered by: tick limit reached / convergence detected /
   collapse event / user interrupt

5. CAUSAL EXTRACTION
   Post-run causal analysis begins on event log

6. GRAPH WRITE
   Results written to Reality Graph Indexer
```

### 9.2 Parallel Run Architecture

CAUSARIUM runs simulations in parallel across independent workers. A single scenario generates N runs simultaneously (default N=100, configurable up to N=1000).

Each run is:
- Independently seeded (random seed stored for reproducibility)
- Isolated (no shared state between runs)
- Written to its own timeline branch in the Reality Graph

**Run manager responsibilities:**
- Allocate workers via Kubernetes job queue
- Aggregate run completion events
- Trigger causal extraction once all runs complete
- Publish Discovery Engine outputs to client subscription

### 9.3 Constraint Parameter System

Reality Physics is implemented as a set of numerical constraint parameters that modify the simulation substrate. Users configure these via sliders in the UI or JSON in the API.

| Parameter | Description | Range | Default |
|---|---|---|---|
| `entropy_rate` | Rate at which organized systems tend toward disorder | 0.0–1.0 | 0.3 |
| `cascade_coefficient` | Multiplier applied to downstream effects of large events | 1.0–5.0 | 1.5 |
| `trust_decay_rate` | Rate at which inter-agent trust erodes without positive interaction | 0.0–1.0 | 0.2 |
| `adaptation_speed` | Global modifier on how fast agents update beliefs | 0.0–1.0 | 0.5 |
| `information_friction` | Delay between an event occurring and agents learning of it | 0–10 ticks | 2 |
| `cooperation_incentive` | Baseline payoff multiplier for cooperative vs competitive behavior | 0.5–2.0 | 1.0 |
| `black_swan_probability` | Per-tick probability of a random exogenous shock event | 0.0–0.05 | 0.01 |

---

## 10. Causal Discovery Layer

This is the core technical differentiator of CAUSARIUM. The causal discovery layer runs on the event log of each completed simulation run and extracts the latent causal structure that produced the observed outcomes.

### 10.1 Causal Extraction Pipeline

```
EVENT LOG (raw agent action sequences)
        │
        ▼
CAUSAL GRAPH CONSTRUCTOR
  - Builds directed graph: Event A → Event B if A preceded B 
    and agent memory indicates A influenced decision to B
  - Filters spurious correlations using do-calculus (Pearl)
  - Assigns causal weight to each edge
        │
        ▼
CHAIN EXTRACTOR
  - Identifies longest significant causal chains
  - Labels each chain with start event, end event, 
    chain length, and cumulative causal weight
  - Names chain: "Hidden Causal Chain #[N]"
        │
        ▼
CROSS-RUN AGGREGATOR
  - Runs same pipeline across all N parallel runs
  - Identifies which chains appear in > X% of runs
  - Identifies which chains are unique to certain runs
        │
        ▼
DISCOVERY ENGINE INPUTS
  - Attractor Mapper
  - Repeller Mapper
  - Choke Point Detector
  - Butterfly Scanner
  - Singularity Finder
  - Paradox Engine
```

### 10.2 Hidden Causal Chain Schema

```json
{
  "chain_id": "HCC-1948",
  "run_ids": ["run-001", "run-017", "run-043"],
  "frequency": 0.34,
  "events": [
    {
      "tick": 3,
      "agent_type": "EXECUTIVE_CFO",
      "action": "BUDGET_CUT",
      "magnitude": 0.20
    },
    {
      "tick": 7,
      "agent_type": "EMPLOYEE_SENIOR",
      "action": "BURNOUT_SIGNAL",
      "magnitude": 0.65
    },
    {
      "tick": 12,
      "agent_type": "EXECUTIVE_CTO",
      "action": "INNOVATION_VELOCITY_DROP",
      "magnitude": 0.40
    },
    {
      "tick": 18,
      "agent_type": "COMPETITOR_DIRECT",
      "action": "MARKET_SHARE_GAIN",
      "magnitude": 0.15
    },
    {
      "tick": 24,
      "agent_type": "INVESTOR_INSTITUTIONAL",
      "action": "POSITION_EXIT",
      "magnitude": 0.80
    }
  ],
  "terminal_outcome": "REVENUE_COLLAPSE",
  "causal_weight": 0.87,
  "intervention_window": {"start_tick": 5, "end_tick": 10}
}
```

---

## 11. Reality Graph and Indexer

### 11.1 Graph Model

The Reality Graph is a property graph database (Neo4j) with the following node and relationship types:

**Node Types**
- `SimulationRun` — a single completed parallel run
- `WorldState` — snapshot of the world at a given tick within a run
- `AgentState` — state of a specific agent at a specific tick
- `Event` — a single agent action or world state change
- `CausalChain` — an extracted hidden causal chain
- `Timeline` — a branch of the graph (collection of runs with similar early trajectories)
- `Reality` — a named, tagged cluster of timelines (an Attractor region in the graph)

**Relationship Types**
- `(:Event)-[:CAUSED]->(:Event)` — direct causal link
- `(:Event)-[:CONTRIBUTED_TO]->(:CausalChain)` — event participates in chain
- `(:SimulationRun)-[:BELONGS_TO]->(:Timeline)` — run assigned to timeline cluster
- `(:Timeline)-[:CONVERGES_TO]->(:Reality)` — timeline is part of an attractor region
- `(:AgentState)-[:AT]->(:WorldState)` — agent state at world state

### 11.2 Vector Index (Qdrant)

All world states and causal chains are embedded via a text embedding model and stored in a vector index. This enables:
- Semantic search across all simulation outputs ("find runs where the company recovered after initial collapse")
- Reality DNA similarity matching
- Cross-scenario knowledge transfer (retrieve causal chains from analogous past scenarios)

### 11.3 DNA Tagging System

Every completed run is tagged with a Reality DNA vector — a normalized float array across 10 dimensions representing the character of that simulation's world.

```json
{
  "run_id": "run-043",
  "reality_dna": {
    "aggression": 0.72,
    "innovation": 0.34,
    "trust": 0.21,
    "risk": 0.88,
    "chaos": 0.61,
    "adaptability": 0.45,
    "fragility": 0.79,
    "resilience": 0.22,
    "intelligence": 0.56,
    "entropy": 0.68
  }
}
```

DNA dimensions are computed from aggregate statistics across agent behaviors in the run. They are used for clustering runs into Timelines and Realities in the graph.

---

## 12. Discovery Engine — Feature Specifications

### 12.1 Attractor Detector

**Definition:** Outcome states that multiple divergent simulation timelines converge toward, regardless of starting conditions or early events.

**Algorithm:**
1. Cluster all terminal world states using k-means on DNA vectors
2. Compute trajectory similarity: what fraction of all runs end in each cluster
3. Label clusters with frequency > 15% as Attractors
4. Trace back the earliest common causal events across runs in each Attractor

**Output:**
```json
{
  "attractor_id": "ATT-007",
  "label": "Regulatory Consolidation",
  "convergence_rate": 0.67,
  "earliest_deterministic_tick": 14,
  "invariant_causal_events": ["HCC-1948", "HCC-0032"],
  "description": "67% of all simulated futures consolidate around regulatory intervention by tick 22, regardless of the company's strategic response in ticks 1–13."
}
```

### 12.2 Repeller Detector

**Definition:** Outcome states that the system systematically avoids — futures that never materialize across any significant fraction of runs.

**Use case:** Identifies impossible goals and structural constraints that no strategy can overcome.

**Algorithm:**
1. Define target outcome from user input
2. Compute fraction of runs achieving target
3. If < 5%, run counterfactual sweep: vary starting conditions, find nearest achieving runs
4. Extract which agent attributes or world parameters would need to change for the target to become reachable

**Output:**
```json
{
  "repeller_id": "REP-003",
  "target_outcome": "$10B valuation within 36 months",
  "achievement_rate": 0.02,
  "structural_blockers": [
    "Market concentration (COMPETITOR_DIRECT) > 0.6 in all starting conditions",
    "Regulatory approval timeline structurally > 18 ticks"
  ],
  "nearest_achieving_condition": "Requires trust_decay_rate < 0.1 AND cascade_coefficient < 1.2"
}
```

### 12.3 Temporal Choke Point Detector

**Definition:** Moments in the simulation timeline where intervention has maximum leverage on downstream outcomes.

**Algorithm:**
1. For each tick T, compute: if we intervene at T (inject a specified action), what fraction of previously negative-trajectory runs shift to positive?
2. Plot intervention efficacy across all ticks
3. Identify peaks: ticks where intervention efficacy is highest

**Output:**
```json
{
  "choke_point_id": "TCP-012",
  "tick": 7,
  "intervention_efficacy": 0.89,
  "effective_interventions": [
    "CEO_COMMUNICATION_EVENT → reduces employee burnout signal by 0.4",
    "INVESTOR_BRIEFING_EVENT → delays institutional exit by 8 ticks"
  ],
  "decay_after_tick": 14
}
```

### 12.4 Butterfly Event Scanner

**Definition:** Agent actions with disproportionately large downstream causal weight relative to their initial magnitude.

**Algorithm:**
1. For every agent action in every run, compute the causal graph weight of all downstream events attributed to it
2. Rank actions by (downstream weight / action magnitude) — the amplification ratio
3. Actions with amplification ratio > threshold are labeled Butterfly Events

**Output:**
```json
{
  "butterfly_id": "BFE-019",
  "event": "EMPLOYEE_RESIGNATION (Tick 4, Agent: EMPLOYEE_SENIOR-007)",
  "action_magnitude": 0.05,
  "downstream_causal_weight": 2.34,
  "amplification_ratio": 46.8,
  "downstream_events": ["HCC-1948", "COMPETITOR_MARKET_ENTRY", "INVESTOR_EXIT_EVENT"]
}
```

### 12.5 Decision Singularity Finder

**Definition:** Decision points where the outcome space bifurcates sharply — small input differences produce radically different terminal outcomes with no middle ground.

**Algorithm:**
1. Identify ticks where run clustering produces bimodal distribution across outcome dimensions
2. Trace the agent decision that caused the bifurcation
3. Compute: how different did inputs need to be to flip the outcome?

**Output:**
```json
{
  "singularity_id": "DS-004",
  "tick": 9,
  "decision": "EXECUTIVE_CEO: ACQUISITION_DECISION",
  "outcome_cluster_a": {"label": "3x revenue growth", "frequency": 0.44},
  "outcome_cluster_b": {"label": "bankruptcy within 20 ticks", "frequency": 0.51},
  "middle_outcome_frequency": 0.05,
  "decision_sensitivity": "Confidence attribute difference of 0.12 flips outcome"
}
```

### 12.6 Causal Paradox Engine

**Definition:** Feedback loops where Agent A's behavior is caused by Agent B's behavior which is itself caused by Agent A's behavior — circular causality traps that represent systemic lock-in.

**Algorithm:**
1. Detect cycles in the causal graph with minimum cycle length 3
2. Compute cycle strength (average causal weight of edges in cycle)
3. Label high-strength cycles as Causal Paradoxes

**Output:**
```json
{
  "paradox_id": "CP-001",
  "cycle": [
    "MEDIA_NEGATIVE_COVERAGE → INVESTOR_CONFIDENCE_DROP",
    "INVESTOR_CONFIDENCE_DROP → EXECUTIVE_DEFENSIVE_BEHAVIOR",
    "EXECUTIVE_DEFENSIVE_BEHAVIOR → MEDIA_NEGATIVE_COVERAGE"
  ],
  "cycle_strength": 0.78,
  "description": "The system is trapped in a self-reinforcing negative spiral. Breaking the cycle requires an exogenous shock; no internal agent action is sufficient."
}
```

---

## 13. Intervention Layer

### 13.1 Purpose

The Intervention Layer allows a human operator to pause a live simulation run mid-execution, inject a change, and observe how the causal structure re-routes in real time. This is simultaneously the most compelling demo feature and the most critical decision-support tool.

### 13.2 Intervention Types

| Type | Description | Example |
|---|---|---|
| **Agent Attribute Injection** | Modify an agent's attributes mid-run | "Increase CEO confidence from 0.4 to 0.8 at Tick 7" |
| **World State Injection** | Inject a world event that all agents perceive | "Regulatory ruling announced at Tick 10" |
| **Agent Removal** | Remove an agent from the simulation | "Key employee resigns" |
| **Agent Addition** | Add a new agent mid-run | "New competitor enters market at Tick 8" |
| **Causal Block** | Prevent a specific action class from executing | "Block all media coverage for 3 ticks" |
| **Trust Reset** | Modify inter-agent trust relationships | "Reset trust between CEO and Board to 0.2" |

### 13.3 Counterfactual Comparison

When an intervention is applied, CAUSARIUM automatically branches the run into two tracks:
- **Track A:** Original trajectory (paused at intervention tick)
- **Track B:** Modified trajectory (post-intervention)

Both tracks run forward simultaneously. The Discovery Engine computes the divergence between them, identifying which downstream causal chains were modified by the intervention.

---

## 14. Reality DNA System

### 14.1 DNA Computation

DNA is computed post-run from aggregate behavioral statistics across all agents and ticks in that run:

| Dimension | Computation |
|---|---|
| `aggression` | Mean hostility score of inter-agent competitive actions |
| `innovation` | Rate of novel solution emergence (actions not in initial possibility space) |
| `trust` | Mean trust score across all agent pairs at terminal state |
| `risk` | Mean risk_tolerance of all actions taken |
| `chaos` | Entropy of the outcome distribution across ticks |
| `adaptability` | Rate of agent belief updates in response to world state changes |
| `fragility` | Sensitivity of terminal state to early-run perturbations |
| `resilience` | Fraction of negative shock events that were recovered from |
| `intelligence` | Mean confidence score of agent decisions at terminal state |
| `entropy` | Information entropy of the causal graph at terminal state |

### 14.2 DNA Use Cases

- **Clustering:** Group similar runs into Timelines and Realities
- **Search:** "Find all runs with high aggression and low trust" → semantic query on DNA vectors
- **Filtering:** User browses the Reality Ocean filtered by DNA profile
- **Transfer:** New scenario seeded with DNA profile from a past successful run

---

## 15. API Specification

### 15.1 Base URL

```
https://api.causarium.io/v1
```

Air-gapped deployment: `https://[on-prem-host]/api/v1`

### 15.2 Authentication

All API requests require Bearer token authentication:
```
Authorization: Bearer <API_KEY>
```

### 15.3 Core Endpoints

#### Create Simulation Run

```
POST /simulations
```

**Request Body:**
```json
{
  "scenario": {
    "title": "Germany Market Entry Q4 2026",
    "context": "We are a $2B US SaaS company planning to enter the German enterprise market...",
    "initial_conditions": {
      "market_concentration": 0.65,
      "regulatory_maturity": "HIGH",
      "competitor_count": 3
    }
  },
  "agents": [
    {
      "type": "EXECUTIVE_CEO",
      "persona": "Growth-focused, high risk tolerance",
      "confidence": 0.75,
      "risk_tolerance": 0.8
    },
    {
      "type": "REGULATOR_INTERNATIONAL",
      "persona": "GDPR-strict, conservative",
      "confidence": 0.9,
      "risk_tolerance": 0.2
    }
  ],
  "run_config": {
    "run_count": 200,
    "tick_depth": 30,
    "constraint_params": {
      "entropy_rate": 0.3,
      "cascade_coefficient": 1.8,
      "black_swan_probability": 0.02
    }
  },
  "discovery_config": {
    "enable_attractors": true,
    "enable_choke_points": true,
    "enable_butterfly_scan": true,
    "enable_singularity_finder": true
  }
}
```

**Response:**
```json
{
  "simulation_id": "sim-a7f3d29c",
  "status": "QUEUED",
  "estimated_completion_seconds": 1200,
  "websocket_url": "wss://api.causarium.io/v1/simulations/sim-a7f3d29c/stream"
}
```

#### Get Simulation Status

```
GET /simulations/{simulation_id}
```

#### Stream Simulation Progress (WebSocket)

```
WS /simulations/{simulation_id}/stream
```

Events streamed:
- `RUN_STARTED` — individual run began
- `RUN_COMPLETED` — individual run finished
- `DISCOVERY_STARTED` — causal extraction in progress
- `ATTRACTOR_FOUND` — new attractor detected
- `CHOKE_POINT_FOUND` — new temporal choke point detected
- `BUTTERFLY_FOUND` — new butterfly event detected
- `SIMULATION_COMPLETE` — all runs and discovery complete

#### Get Discovery Engine Outputs

```
GET /simulations/{simulation_id}/discovery
```

**Response:**
```json
{
  "simulation_id": "sim-a7f3d29c",
  "run_count": 200,
  "completed_at": "2026-07-11T14:32:00Z",
  "attractors": [...],
  "repellers": [...],
  "choke_points": [...],
  "butterfly_events": [...],
  "singularities": [...],
  "causal_paradoxes": [...],
  "hidden_causal_chains": [...],
  "reality_dna_distribution": {...}
}
```

#### Trigger Intervention

```
POST /simulations/{simulation_id}/interventions
```

**Request Body:**
```json
{
  "target_run_id": "run-043",
  "pause_at_tick": 7,
  "intervention_type": "AGENT_ATTRIBUTE_INJECTION",
  "payload": {
    "agent_id": "agent-CEO-001",
    "attribute": "confidence",
    "new_value": 0.85
  },
  "run_counterfactual": true
}
```

#### Generate Reality Report

```
POST /simulations/{simulation_id}/report
```

**Response:**
```json
{
  "report_id": "rpt-9f2b1a3d",
  "download_url": "https://api.causarium.io/v1/reports/rpt-9f2b1a3d",
  "format": "PDF",
  "pages": 12
}
```

#### Reality Graph Query

```
POST /graph/query
```

**Request Body:**
```json
{
  "cypher": "MATCH (r:Reality)<-[:CONVERGES_TO]-(t:Timeline)<-[:BELONGS_TO]-(s:SimulationRun) WHERE r.convergence_rate > 0.5 RETURN r, count(s) as run_count ORDER BY run_count DESC LIMIT 10"
}
```

---

## 16. Data Models

### 16.1 Core Entities

```python
class Simulation(BaseModel):
    simulation_id: UUID
    title: str
    context: str
    status: Enum['QUEUED', 'RUNNING', 'DISCOVERY', 'COMPLETE', 'FAILED']
    tenant_id: UUID
    created_at: datetime
    completed_at: Optional[datetime]
    run_config: RunConfig
    discovery_config: DiscoveryConfig

class SimulationRun(BaseModel):
    run_id: UUID
    simulation_id: UUID
    seed: int
    status: Enum['RUNNING', 'COMPLETE', 'FAILED']
    tick_count: int
    terminal_outcome: Optional[str]
    reality_dna: Dict[str, float]
    event_log_id: UUID

class Agent(BaseModel):
    agent_id: UUID
    run_id: UUID
    agent_type: str
    persona: str
    attributes: AgentAttributes
    memory_stream_id: UUID

class Event(BaseModel):
    event_id: UUID
    run_id: UUID
    tick: int
    agent_id: UUID
    action_type: str
    action_payload: Dict
    causal_parents: List[UUID]
    causal_weight: float
    timestamp: datetime

class CausalChain(BaseModel):
    chain_id: str
    simulation_id: UUID
    run_ids: List[UUID]
    frequency: float
    events: List[ChainEvent]
    terminal_outcome: str
    causal_weight: float
    intervention_window: TickRange

class Attractor(BaseModel):
    attractor_id: str
    simulation_id: UUID
    label: str
    convergence_rate: float
    earliest_deterministic_tick: int
    invariant_chains: List[str]
    dna_centroid: Dict[str, float]
```

---

## 17. UI/UX Requirements

### 17.1 Primary Views

**View 1: Scenario Composer**
- Natural language context input (rich text)
- Agent roster builder (drag-and-drop from type library, attribute sliders)
- Constraint parameter controls (named sliders with plain-language labels)
- Run configuration (run count, tick depth)
- Discovery toggle panel

**View 2: Simulation Monitor (Live)**
- Live run progress (N runs / N total)
- Real-time event feed (streaming agent actions across active runs)
- Discovery alerts panel (Attractor Found, Butterfly Detected, etc.)
- Estimated completion timer

**View 3: Discovery Engine Dashboard**
- Primary output: Attractor summary with convergence rates
- Hidden Causal Chain browser (searchable, filterable by outcome type)
- Temporal Choke Point timeline (visual — intervention efficacy plotted over time)
- Butterfly Event leaderboard (ranked by amplification ratio)
- Singularity map (outcome bifurcation points plotted on timeline)

**View 4: Reality Graph Explorer**
- Graph visualization of runs, timelines, and realities
- Node filtering by DNA attributes
- Click any node to drill into that run's event log
- Semantic search bar ("show me all futures where trust collapsed")

**View 5: Intervention Console**
- Select an active or completed run
- Select intervention type and parameters
- Watch counterfactual track run alongside original
- Diff view: which causal chains changed?

**View 6: Reality Report**
- Auto-generated PDF/document output
- Executive summary (3 paragraphs, non-technical)
- Attractor briefing (what keeps happening)
- Critical windows (temporal choke points)
- Hidden risks (top 5 causal chains)
- Recommended interventions (ranked by efficacy)
- Appendix: full Discovery Engine outputs

### 17.2 Design Principles

- **No dashboards that look like dashboards.** CAUSARIUM should feel like a scientific instrument, not a BI tool. Dark interface, precise typography, data-dense but never cluttered.
- **Every number is a portal.** Clicking any metric drills into the simulation runs that produced it.
- **Language over jargon.** All Discovery Engine outputs display in plain English first, technical details in expandable secondary panels.
- **The Intervention Console is always one click away.** Operators need to be able to pause and inject within 2 interactions from any view.

---

## 18. Infrastructure and Scalability

### 18.1 Deployment Architecture

```
Production (Cloud)
├── API Layer         — FastAPI on Kubernetes (3+ replicas, auto-scale)
├── Simulation Workers — Celery on Kubernetes (auto-scale to 500+ pods)
├── LLM Routing       — LiteLLM proxy for multi-provider LLM calls
├── Message Queue     — RabbitMQ (simulation job queuing)
├── Graph DB          — Neo4j Enterprise (clustered)
├── Vector DB         — Qdrant (clustered)
├── Event Store       — PostgreSQL + TimescaleDB (append-only event logs)
├── Cache             — Redis Cluster (agent memory hot layer)
└── Object Storage    — S3 (simulation run archives, report PDFs)

Air-Gapped Deployment (Defense)
├── Same architecture
├── All LLM calls routed to on-prem model (Llama 3 / Mistral)
├── No external network egress
└── Hardware Security Module (HSM) for key management
```

### 18.2 Scalability Targets

| Metric | Target |
|---|---|
| Concurrent simulation runs | 500 |
| Agents per run | Up to 1,000 |
| Ticks per run | Up to 100 |
| LLM calls per simulation (100 runs × 50 agents × 30 ticks) | ~150,000 |
| Graph nodes per completed simulation | ~500,000 |
| API throughput | 10,000 requests/minute |
| Reality Graph total size (12 months) | 50B+ nodes |

### 18.3 Cost Model (LLM Compute)

At scale, LLM call volume is the primary cost driver. Mitigation strategies:

- **Lightweight agents by default:** Use small/fast models (GPT-4o-mini, Haiku) for standard agent decisions. Reserve large models (GPT-4o, Claude Sonnet) for high-stakes agent decisions and reflection cycles.
- **Caching:** Identical world state + agent state → cache the LLM output.
- **Batching:** Group agent decision calls where world state is identical to reduce API round trips.
- **Async bulk pricing:** Use batch APIs where available for non-real-time runs.

---

## 19. Security and Compliance

### 19.1 Data Security

- All simulation inputs and outputs encrypted at rest (AES-256)
- All API traffic encrypted in transit (TLS 1.3)
- Tenant isolation: all simulation data partitioned by tenant_id at database level
- No cross-tenant data sharing or model fine-tuning on customer simulation data

### 19.2 Access Control

- Role-based access control (RBAC) via Casbin
- Roles: `ADMIN`, `SCENARIO_DESIGNER`, `ANALYST`, `VIEWER`, `API_USER`
- Per-scenario access controls (share specific simulations with specific users)

### 19.3 Compliance

- GDPR: No personal data stored in simulation runs. Agent personas are archetypes, not individuals.
- SOC 2 Type II: Targeted for Month 9
- ISO 27001: Targeted for Year 2
- Defense deployments: Follow applicable national data classification standards (India: MeitY sensitive data guidelines; US: NIST 800-171 for CUI)

### 19.4 Audit Logging

All API calls, simulation runs, and user actions are logged to an immutable audit trail. Audit logs are tamper-evident (append-only, hash-chained). Retention: 7 years.

---

## 20. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Backend API** | FastAPI (Python 3.12) | Async-first, OpenAPI auto-generation, ecosystem |
| **Agent Orchestration** | LangGraph | Production-grade multi-agent state machines, checkpointing |
| **LLM Gateway** | LiteLLM | Multi-provider routing, fallback, cost tracking |
| **Task Queue** | Celery + RabbitMQ | Distributed simulation job management |
| **Container Orchestration** | Kubernetes (GKE / self-hosted for defense) | Horizontal scaling of simulation workers |
| **Graph Database** | Neo4j Enterprise | Native property graph, Cypher query, clustering |
| **Vector Database** | Qdrant | High-performance semantic search, DNA similarity |
| **Event Store** | PostgreSQL 16 + TimescaleDB | Time-series event logs, ACID compliance |
| **Agent Memory Cache** | Redis Cluster | Sub-millisecond hot memory access |
| **Frontend** | React 19 + TypeScript | Component-based, strong typing |
| **Graph Visualization** | D3.js + custom WebGL layer | Reality Graph Explorer rendering |
| **Report Generation** | WeasyPrint + Jinja2 | Programmatic PDF generation |
| **Auth** | Auth0 / Keycloak (air-gapped) | OAuth2 + JWT |
| **Monitoring** | Prometheus + Grafana + OpenTelemetry | Full observability stack |
| **CI/CD** | GitHub Actions + ArgoCD | GitOps deployment |

---

## 21. Phased Delivery Roadmap

### Phase 1: Foundation (Months 1–3)

**Goal:** Working end-to-end simulation pipeline with basic causal extraction.

Deliverables:
- Agent Substrate Layer (LangGraph-based, 15 default agent types)
- Simulation Orchestrator (parallel runs, up to 50 concurrent)
- Event log infrastructure (PostgreSQL + TimescaleDB)
- Basic Causal Chain Extractor (top 10 chains per simulation)
- REST API (scenario creation, run status, chain retrieval)
- Internal CLI interface for testing

Success criteria:
- 50 parallel runs complete in < 20 minutes
- Causal chains extracted from 100% of completed runs
- Agent behavioral diversity score > 0.7 (agents exhibit distinct decision patterns)

### Phase 2: Discovery Engine (Months 4–6)

**Goal:** Full Discovery Engine operational. Reality Graph online. Core UI live.

Deliverables:
- Attractor Detector
- Temporal Choke Point Detector
- Butterfly Event Scanner
- Reality Graph Indexer (Neo4j + Qdrant)
- DNA Tagger
- Discovery Engine Dashboard (React)
- Scenario Composer UI
- WebSocket streaming API

Success criteria:
- Attractors detected in > 90% of simulations with N ≥ 100 runs
- Reality Graph query latency < 500ms for standard queries
- 3 pilot customers onboarded on early access

### Phase 3: Intelligence Layer (Months 7–9)

**Goal:** Remaining Discovery features, Intervention Layer, Reality Report.

Deliverables:
- Decision Singularity Finder
- Causal Paradox Engine
- Repeller Detector
- Intervention Layer (pause, inject, counterfactual compare)
- Reality Report Generator (auto-PDF)
- Reality Graph Explorer (visual, filterable)
- Multi-tenant production deployment
- SOC 2 Type II audit initiated

Success criteria:
- 500 concurrent simulation runs supported
- Time to First Insight < 30 minutes (P75)
- First paid enterprise customer signed
- Reality Reports rated "decision-relevant" by > 80% of users in structured review

### Phase 4: Scale and Defense (Months 10–12)

**Goal:** Air-gapped defense deployment, API ecosystem, performance hardening.

Deliverables:
- Air-gapped on-prem deployment package (Kubernetes Helm chart)
- Local LLM integration (Llama 3, Mistral) for classified environments
- Developer API (public documentation, SDK in Python and TypeScript)
- 1,000-agent per run support
- Advanced DNA search and filtering
- Customer admin portal
- Billing and usage metering

Success criteria:
- First defense customer in active evaluation
- 5 paying enterprise customers
- $2M ARR pipeline
- 10,000 simulation runs completed on platform

---

## 22. Risks and Mitigations

| Risk | Severity | Probability | Mitigation |
|---|---|---|---|
| **LLM cost overrun** — 150K LLM calls per simulation becomes economically unviable | HIGH | MEDIUM | Tiered model routing (small models for routine decisions, large for critical); batching; caching identical states |
| **Agent behavioral collapse** — agents converge to homogeneous behavior, destroying emergence | HIGH | MEDIUM | Diversity enforcement mechanism: penalize runs where agent variance drops below threshold; temperature management |
| **Causal extraction false positives** — spurious correlations labeled as causal chains | HIGH | HIGH | do-calculus filtering; require minimum frequency threshold across N runs before labeling a chain causal |
| **Simulation latency too high** — enterprise users expect fast feedback | MEDIUM | MEDIUM | Tiered run depths: Quick Mode (20 runs, 15 ticks, ~5 min) and Deep Mode (500 runs, 50 ticks, ~2 hours) |
| **Defense deployment air-gap friction** — classified environments have strict constraints | MEDIUM | HIGH | Plan local LLM from Month 1; build with model-agnostic abstraction layer from day one |
| **Narrative trust gap** — buyers skeptical that emergent outcomes are "real" not "hallucinated" | HIGH | HIGH | Every output traceable to specific simulation run IDs and agent action logs; full audit trail |
| **Competitor fast-follow** — Palantir or a well-funded startup replicates the concept | MEDIUM | LOW | Causal knowledge graph is the moat; accumulate runs aggressively to widen the data advantage |

---

## 23. Open Questions

1. **Validation methodology** — How do we measure whether a Hidden Causal Chain that CAUSARIUM discovered is "correct"? We need a retrospective validation protocol: take historical scenarios, run CAUSARIUM, compare predicted chains to what actually happened.

2. **Agent population size sweet spot** — Research suggests 24–200 agents produces rich emergence. What is the minimum viable agent count for an enterprise scenario with sufficient behavioral diversity? Requires empirical testing in Phase 1.

3. **Tick-to-time mapping** — Does one tick represent one day, one week, one quarter? This mapping is currently user-defined, but we need a calibrated default that makes outputs interpretable.

4. **Reality Ocean UI** — The star-field visualization of all futures is a powerful pitch moment but a potentially poor daily-use UI. We should build it as an optional "exploration mode" while the Discovery Engine Dashboard is the primary work surface.

5. **LLM fine-tuning vs prompting** — Should agent personas be expressed entirely through prompt engineering, or do we fine-tune domain-specific models for agent types (e.g., a fine-tuned "CFO model")? Fine-tuning creates better behavioral authenticity but complicates the model-agnostic abstraction.

6. **Causal graph compute cost** — Extracting causal chains from a 500-run, 100-tick simulation with 100 agents produces a graph with potentially 500M edge candidates. We need an efficient causal graph construction algorithm that scales to this volume without running on GPU clusters.

7. **Pricing model** — Per-run pricing, per-seat licensing, or outcome-based? Per-run aligns with usage but creates friction for exploration. Annual subscription with run credits is likely the right balance.

---

*CAUSARIUM Product Requirements Document v1.0.0*  
*Confidential — Not for external distribution*  
*© 2026 CAUSARIUM. All rights reserved.*
