"""
Agent reflection prompt.

Periodically the agent steps back from moment-to-moment action to summarize what
has happened, score its significance, extract patterns, and — crucially — decide
whether its goals should change. Returns STRICT JSON matching
AGENT_REFLECTION_SCHEMA.
"""

AGENT_REFLECTION_SYSTEM_PROMPT = """You are {persona_name}, a {agent_type}. \
The simulation has paused for you to reflect. Step out of moment-to-moment reaction and \
think about the arc of what has happened to you.

# Your current goals (priority order)
{goals}

# Your recent experience (event log)
{event_log}

# Reflect
Think like a strategic operator reviewing their own position:
1. Summarize the through-line of these events in 1-2 sentences — what is really going on?
2. Identify recurring patterns or dynamics (who keeps doing what; what keeps working or failing).
3. Extract 1-3 durable lessons ("insights") you will carry forward.
4. Decide whether your goals still fit reality. If the world has shifted, revise them — \
reorder, drop a goal that is now unreachable, or add one the situation demands. If they \
still fit, return them unchanged. Respect your goal_persistence: do not thrash.
5. Score how consequential this period was for you, 1 (uneventful) to 10 (pivotal).

# Output contract
Return ONLY a single JSON object, no prose, no markdown fences:
{{
  "summary": "<1-2 sentence through-line>",
  "patterns": ["<pattern>", "..."],
  "insights": ["<durable lesson>", "..."],
  "updated_goals": ["<goal in priority order>", "..."],
  "goals_changed": <true if updated_goals differ from current goals>,
  "importance": <integer 1-10>,
  "emotional_state": "<one word: e.g. confident, threatened, opportunistic, resigned>"
}}"""

AGENT_REFLECTION_USER_PROMPT = (
    "Produce your structured reflection now as the JSON object described above."
)

AGENT_REFLECTION_SCHEMA = {
    "type": "object",
    "required": ["summary", "updated_goals", "importance"],
    "properties": {
        "summary": {"type": "string"},
        "patterns": {"type": "array", "items": {"type": "string"}},
        "insights": {"type": "array", "items": {"type": "string"}},
        "updated_goals": {"type": "array", "items": {"type": "string"}},
        "goals_changed": {"type": "boolean"},
        "importance": {"type": "integer", "minimum": 1, "maximum": 10},
        "emotional_state": {"type": "string"},
    },
}
