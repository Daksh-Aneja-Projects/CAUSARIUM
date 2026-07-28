# Architecture

CAUSARIUM turns "what might happen?" into "what keeps happening, why, and where
can I still change it?". Data flows in one direction, from a composed scenario to
a narrated set of discovered futures.

## Pipeline

```
Scenario (agents + lens + reality physics)
      |
      v
Simulation substrate  ---------------------------------------------------------
  - WorldState + ConstraintParams ("reality physics")
  - ActionResolver: entropy erosion, cooperation incentive, cascade
    amplification, finite-resource contention, exogenous black swans, trust decay
  - Two run modes:
      heuristic : fast, deterministic, attribute-driven policy (no LLM)
      llm       : each agent reasons via the local Ollama cognition stack
  - Streams live per-tick agent interactions over WebSocket
      |
      v
RunResult (per run) ------------------------------------------------------------
  - resolved event log + terminal agent state
  - Reality DNA: a 10-dim behavioral fingerprint (aggression, innovation, trust,
    risk, chaos, adaptability, fragility, resilience, intelligence, entropy)
  - terminal outcome classification
      |
      v
Causal extraction --------------------------------------------------------------
  - per-run causal graph (explicit cascade edges + inferred responsive /
    contested / exogenous influence edges)
  - do-calculus filter: keep only edges that reproduce across independent runs
  - longest-weight causal chains (O(V+E) DP)
      |
      v
Discovery engines --------------------------------------------------------------
  attractor  : k-means over reality-DNA, basins above 15%
  repeller   : outcomes the system structurally resists, with DNA-gap blockers
  choke point: ticks with maximal downstream leverage
  butterfly  : small actions with outsized downstream causal weight
  singularity: reality-DNA bimodality (futures that fork)
  paradox    : self-reinforcing cycles on the structural graph (length-bounded)
      |
      v
Narrative + persistence + UI ---------------------------------------------------
  - plain-English narration of every finding, adapted to the analysis lens
  - Neo4j reality graph + Qdrant DNA-vector similarity (in-memory fallbacks)
  - live React UI: force-network collider, narrated dashboard, constellation
```

## Key design decisions

- **Reality physics as parameters.** Entropy, cascade, cooperation incentive,
  trust decay, and black-swan probability are numeric `ConstraintParams` applied
  by the `ActionResolver`, so the same agents produce different dynamics under
  different "laws".
- **One contract, `RunResult`.** Everything downstream of the simulation consumes
  `RunResult`, so the whole pipeline speaks one representation.
- **Do-calculus by reproducibility.** An edge that survives repeated independent
  randomization of the world is treated as causal; single-run coincidences are
  filtered out.
- **Lenses.** A lens is a reading of the same simulation output: it relabels
  outcomes, picks an accent, and emphasizes the findings that matter for that kind
  of question. The engine is invariant; the interpretation adapts.
- **Non-blocking server.** Discovery and DB persistence are CPU/IO-bound and run
  in worker threads so the async event loop (and the live WebSocket) stay
  responsive.
- **Everything degrades gracefully.** No Ollama -> deterministic heuristic policy.
  No Neo4j/Qdrant -> in-memory graph + vector fallbacks. Nothing external is
  required to run the product end to end.
