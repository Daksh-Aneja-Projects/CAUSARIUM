"""
Action resolution — the "reality physics" of CAUSARIUM.

Turns a tick's worth of proposed agent actions into a resolved sequence of global
events, applying the ConstraintParams as genuine forces:

- entropy_rate         -> erodes action effectiveness (organized effort decays)
- cascade_coefficient  -> amplifies large successful actions and may spawn
                          secondary downstream events (with causal parentage)
- black_swan_probability -> injects exogenous shocks independent of any agent
- cooperation_incentive -> tilts payoffs toward cooperative actions
- trust_decay_rate      -> erodes inter-agent trust each tick without positive contact

Contentious actions (finite-resource grabs) targeting the same object within a
tick are resolved by effective power; losers are marked CONTESTED. Resolution is
stochastic but fully reproducible: the RNG is seeded from (run_id, tick), so a
given world state always resolves identically.
"""

import hashlib
import uuid
from random import Random
from typing import Any, Dict, List, Optional

from ..constants import ActionType, AGGRESSIVE_ACTIONS, CONTENTIOUS_ACTIONS
from .world_state import WorldState


class ActionResolver:
    def __init__(self) -> None:
        pass

    # ------------------------------------------------------------------ #
    # Public entry point
    # ------------------------------------------------------------------ #
    def resolve(
        self, world_state: WorldState, proposed_actions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        rng = self._rng(world_state.run_id, world_state.tick)
        cp = world_state.constraint_params

        # 1. Resolve contention among finite-resource grabs.
        winners = self._resolve_contention(proposed_actions, world_state, rng)

        # 2. Resolve each action's outcome under entropy + cascade physics.
        resolved: List[Dict[str, Any]] = []
        for action in proposed_actions:
            event = self._resolve_single(
                action,
                world_state,
                rng,
                contested=id(action) not in winners,
            )
            resolved.append(event)

            # Cascade: a large successful action can ripple into a secondary event.
            cascade = self._maybe_cascade(event, cp, rng)
            if cascade is not None:
                resolved.append(cascade)

            # Apply the event's effect to the persistent world state.
            self._apply_effect(event, world_state)

        # 3. Exogenous shock, independent of agents.
        swan = self._maybe_black_swan(world_state, rng)
        if swan is not None:
            resolved.append(swan)
            self._apply_effect(swan, world_state)

        # 4. Global trust decay each tick.
        self._decay_trust(world_state)

        return resolved

    # ------------------------------------------------------------------ #
    # Contention
    # ------------------------------------------------------------------ #
    def _resolve_contention(
        self,
        actions: List[Dict[str, Any]],
        world_state: WorldState,
        rng: Random,
    ) -> set:
        """
        Return the set of id(action) that WIN their contested resource. Actions
        that are not contentious always "win" (nothing to contest). When several
        contentious actions target the same object, the one with the highest
        effective power wins; the rest are contested.
        """
        by_target: Dict[str, List[Dict[str, Any]]] = {}
        winners: set = set()

        for action in actions:
            atype = _as_action_type(action.get("action_type"))
            if atype not in CONTENTIOUS_ACTIONS:
                winners.add(id(action))
                continue
            target = str(action.get("target", "ENVIRONMENT"))
            by_target.setdefault(f"{atype.value}:{target}", []).append(action)

        for contenders in by_target.values():
            if len(contenders) == 1:
                winners.add(id(contenders[0]))
                continue
            best = max(
                contenders,
                key=lambda a: self._effective_power(a, world_state)
                + rng.uniform(0, 0.05),  # tiny jitter breaks exact ties deterministically
            )
            winners.add(id(best))

        return winners

    # ------------------------------------------------------------------ #
    # Single-action resolution
    # ------------------------------------------------------------------ #
    def _resolve_single(
        self,
        action: Dict[str, Any],
        world_state: WorldState,
        rng: Random,
        contested: bool,
    ) -> Dict[str, Any]:
        cp = world_state.constraint_params
        atype = _as_action_type(action.get("action_type"))
        magnitude = _clamp(action.get("magnitude", 0.0))

        power = self._effective_power(action, world_state)

        # Entropy erodes effective magnitude: the more disordered the world, the
        # less of your intended force actually lands.
        entropy_loss = cp.entropy_rate * magnitude * rng.uniform(0.5, 1.0)
        effect = max(0.0, magnitude - entropy_loss)

        # Cooperation incentive tilts payoff for cooperative vs aggressive moves.
        if atype in AGGRESSIVE_ACTIONS:
            effect *= 2.0 - cp.cooperation_incentive  # incentive>1 dampens aggression
        elif atype in {ActionType.COOPERATE, ActionType.FORM_ALLIANCE,
                       ActionType.NEGOTIATE, ActionType.DE_ESCALATE}:
            effect *= cp.cooperation_incentive

        # WAIT never "succeeds" in the causal sense.
        if atype is ActionType.WAIT:
            status = "IDLE"
            effect = 0.0
        elif contested:
            status = "CONTESTED"
            effect *= 0.25
        else:
            # Success probability grows with power, shrinks with entropy.
            p_success = _clamp(0.35 + 0.6 * power - 0.3 * cp.entropy_rate)
            status = "SUCCESS" if rng.random() < p_success else "FAILED"
            if status == "FAILED":
                effect *= 0.1

        return {
            "event_id": str(uuid.uuid4()),
            "run_id": world_state.run_id,
            "tick": world_state.tick,
            "type": "ACTION_EXECUTED",
            "agent_id": action.get("agent_id"),
            "agent_type": action.get("agent_type"),
            "action_type": atype.value,
            "target": action.get("target", "ENVIRONMENT"),
            "magnitude": magnitude,
            "effect_magnitude": round(effect, 4),
            "status": status,
            "aggressive": atype in AGGRESSIVE_ACTIONS,
            "causal_parents": [],
            "rationale": action.get("rationale", ""),
        }

    # ------------------------------------------------------------------ #
    # Cascade
    # ------------------------------------------------------------------ #
    def _maybe_cascade(
        self, event: Dict[str, Any], cp: Any, rng: Random
    ) -> Optional[Dict[str, Any]]:
        """A large successful action ripples: cascade_coefficient scales both the
        probability and the magnitude of a spawned secondary event."""
        if event["status"] != "SUCCESS":
            return None
        effect = event["effect_magnitude"]
        # Larger effects and higher cascade coefficients ripple more often.
        p_cascade = _clamp((cp.cascade_coefficient - 1.0) / 4.0 * effect)
        if rng.random() >= p_cascade:
            return None
        return {
            "event_id": str(uuid.uuid4()),
            "run_id": event["run_id"],
            "tick": event["tick"],
            "type": "CASCADE",
            "agent_id": event["agent_id"],
            "agent_type": event["agent_type"],
            "action_type": event["action_type"],
            "target": event["target"],
            "magnitude": event["magnitude"],
            "effect_magnitude": round(effect * cp.cascade_coefficient, 4),
            "status": "SUCCESS",
            "aggressive": event["aggressive"],
            "causal_parents": [event["event_id"]],
            "rationale": "cascade of " + (event.get("rationale", "") or "prior event"),
        }

    # ------------------------------------------------------------------ #
    # Black swan
    # ------------------------------------------------------------------ #
    def _maybe_black_swan(
        self, world_state: WorldState, rng: Random
    ) -> Optional[Dict[str, Any]]:
        cp = world_state.constraint_params
        if rng.random() >= cp.black_swan_probability:
            return None
        shocks = [
            "MARKET_CRASH", "REGULATORY_SHOCK", "TECH_BREAKTHROUGH",
            "SUPPLY_DISRUPTION", "SCANDAL_LEAK", "GEOPOLITICAL_EVENT",
        ]
        shock = shocks[rng.randrange(len(shocks))]
        return {
            "event_id": str(uuid.uuid4()),
            "run_id": world_state.run_id,
            "tick": world_state.tick,
            "type": "BLACK_SWAN",
            "agent_id": None,
            "agent_type": "EXOGENOUS",
            "action_type": shock,
            "target": "ALL",
            "magnitude": round(rng.uniform(0.6, 1.0), 4),
            "effect_magnitude": round(rng.uniform(0.6, 1.0) * cp.cascade_coefficient, 4),
            "status": "SUCCESS",
            "aggressive": True,
            "causal_parents": [],
            "rationale": f"Exogenous shock: {shock}",
        }

    # ------------------------------------------------------------------ #
    # Effect application to world state
    # ------------------------------------------------------------------ #
    def _apply_effect(self, event: Dict[str, Any], world_state: WorldState) -> None:
        """Mutate persistent agent state so the world actually evolves tick-to-tick."""
        if event["status"] not in ("SUCCESS",):
            return
        actor = world_state.agents.get(event.get("agent_id") or "")
        effect = event["effect_magnitude"]
        atype = event["action_type"]

        if event["type"] == "BLACK_SWAN":
            for agent in world_state.agents.values():
                agent.capital = round(agent.capital - 0.1 * effect, 4)
            return

        if actor is None:
            return

        if atype in (ActionType.INVEST.value, ActionType.ACQUIRE.value):
            actor.capital = round(actor.capital + 0.5 * effect, 4)
            actor.influence = round(min(1.0, actor.influence + 0.2 * effect), 4)
        elif atype == ActionType.DIVEST.value:
            actor.capital = round(actor.capital + 0.2 * effect, 4)
        elif atype in (ActionType.COOPERATE.value, ActionType.FORM_ALLIANCE.value):
            actor.influence = round(min(1.0, actor.influence + 0.1 * effect), 4)
            target = world_state.agents.get(str(event.get("target")))
            if target is not None:
                actor.trust_network[target.agent_id] = _clamp(
                    actor.trust_network.get(target.agent_id, 0.0) + 0.1 * effect, -1.0, 1.0
                )
        elif atype in (ActionType.SABOTAGE.value, ActionType.BETRAY.value):
            target = world_state.agents.get(str(event.get("target")))
            if target is not None:
                target.capital = round(target.capital - 0.4 * effect, 4)
                actor.trust_network[target.agent_id] = _clamp(
                    actor.trust_network.get(target.agent_id, 0.0) - 0.3 * effect, -1.0, 1.0
                )
        elif atype == ActionType.INNOVATE.value:
            actor.influence = round(min(1.0, actor.influence + 0.15 * effect), 4)

    def _decay_trust(self, world_state: WorldState) -> None:
        rate = world_state.constraint_params.trust_decay_rate
        if rate <= 0:
            return
        for agent in world_state.agents.values():
            for other, value in list(agent.trust_network.items()):
                agent.trust_network[other] = round(value * (1.0 - rate), 4)

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _effective_power(self, action: Dict[str, Any], world_state: WorldState) -> float:
        """Combine the actor's influence/capital with the action's committed magnitude."""
        magnitude = _clamp(action.get("magnitude", 0.0))
        actor = world_state.agents.get(action.get("agent_id") or "")
        influence = actor.influence if actor is not None else 0.5
        capital_bonus = min(0.3, (actor.capital if actor is not None else 0.0) * 0.1)
        return _clamp(0.5 * magnitude + 0.4 * influence + capital_bonus)

    @staticmethod
    def _rng(run_id: str, tick: int) -> Random:
        seed_src = f"{run_id}:{tick}".encode("utf-8")
        seed = int(hashlib.sha256(seed_src).hexdigest()[:12], 16)
        return Random(seed)


# --------------------------------------------------------------------------- #
# Module-level helpers
# --------------------------------------------------------------------------- #
def _clamp(x: Any, lo: float = 0.0, hi: float = 1.0) -> float:
    try:
        return max(lo, min(hi, float(x)))
    except (TypeError, ValueError):
        return lo


def _as_action_type(value: Any) -> ActionType:
    try:
        return ActionType(value)
    except (ValueError, KeyError):
        return ActionType.WAIT
