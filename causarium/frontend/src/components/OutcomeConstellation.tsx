import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ============================================================================
 * OutcomeConstellation
 * ----------------------------------------------------------------------------
 * A cinematic, full-screen overlay that renders the futures discovered by a
 * completed simulation as a "constellation":
 *   - Each ATTRACTOR is a glowing gravity-well disc (basin the futures fall into)
 *   - Each simulation run is a faint orbiting star scattered around its well
 *   - Hidden causal chains draw as luminous arc filaments across the canvas
 *   - A scrolling inspector panel surfaces choke points, butterflies, etc.
 *
 * Fully self-contained: no external deps, no other files touched.
 * Layout is deterministic (seeded from ids) so the map is stable across renders.
 * Animation state lives in refs; prefers-reduced-motion disables motion.
 * ==========================================================================*/

// --- Prop contract -----------------------------------------------------------
interface Lens {
  id: string;
  label: string;
  accent: string;
  icon: string;
  particle_term: string;
  outcome_vocab: Record<string, string>;
}
interface Attractor {
  attractor_id: string;
  label: string;
  convergence_rate: number;
  earliest_deterministic_tick: number;
  dna_centroid: Record<string, number>;
  member_run_ids: string[];
}
interface Chain {
  chain_id: string;
  events: { agent_type: string; action: string }[];
  causal_weight: number;
  frequency: number;
  terminal_outcome: string;
}
interface Discovery {
  attractors: Attractor[];
  hidden_causal_chains: Chain[];
  choke_points: { choke_point_id: string; tick: number; intervention_efficacy: number }[];
  butterfly_events: any[];
  singularities: any[];
  causal_paradoxes: any[];
  reality_dna_distribution: Record<string, number>;
  outcome_distribution: Record<string, number>;
}
interface GraphData {
  nodes: { id: string; agent_type: string; action: string; degree: number }[];
  edges: { source: string; target: string; weight: number; frequency: number }[];
}
export interface OutcomeConstellationProps {
  discovery: Discovery;
  graph?: GraphData | null;
  lens?: Lens | null;
  onClose: () => void;
}

// --- Canonical outcome palette ----------------------------------------------
const OUTCOME_COLORS: Record<string, string> = {
  SYSTEMIC_COLLAPSE: '#FF3366',
  CONFLICT_ESCALATION: '#FF7A45',
  MONOPOLY_CAPTURE: '#FFB800',
  DISRUPTIVE_INNOVATION: '#B36CFF',
  STABLE_COOPERATION: '#00E5A0',
  FRAGMENTED_STALEMATE: '#00D9FF',
};

// Canvas dimensions in an abstract SVG coordinate space (viewBox-scaled).
const W = 1000;
const H = 640;

// --- Deterministic helpers ---------------------------------------------------
// Small string hash -> stable unsigned int (used to seed layout/jitter).
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// Deterministic pseudo-random in [0,1) from a numeric seed.
function seeded(seed: number): number {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

// Map an attractor/chain label or outcome key to a color. If the text contains
// (or matches) a known OUTCOME key we use that; otherwise fall back to accent.
function colorForText(text: string, accent: string): string {
  const up = (text || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (OUTCOME_COLORS[up]) return OUTCOME_COLORS[up];
  for (const key of Object.keys(OUTCOME_COLORS)) {
    if (up.includes(key)) return OUTCOME_COLORS[key];
  }
  return accent;
}

// --- Layout types ------------------------------------------------------------
interface Well {
  a: Attractor;
  x: number;
  y: number;
  r: number;
  color: string;
  stars: { x: number; y: number; radius: number; phase: number; orbit: number; base: number }[];
}

export const OutcomeConstellation: React.FC<OutcomeConstellationProps> = ({
  discovery,
  graph,
  lens,
  onClose,
}) => {
  const accent = lens?.accent ?? '#6C63FF';
  const vocab = lens?.outcome_vocab ?? {};
  const term = lens?.particle_term ?? 'run';
  const label = (key: string) => vocab[key] ?? key;

  // Which chain / well is currently hovered (for the inspector).
  const [hoverChain, setHoverChain] = useState<Chain | null>(null);
  const [hoverWell, setHoverWell] = useState<Attractor | null>(null);

  // Respect reduced-motion (initialise from the media query, then subscribe).
  const [reduceMotion, setReduceMotion] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // --- Deterministic well layout (radial tiers around canvas centre) --------
  const wells = useMemo<Well[]>(() => {
    const list = discovery.attractors ?? [];
    if (list.length === 0) return [];
    // Sort by convergence so the strongest basin sits centre-stage.
    const sorted = [...list].sort((a, b) => b.convergence_rate - a.convergence_rate);
    const cx = W / 2;
    const cy = H / 2;
    return sorted.map((a, i) => {
      // First well anchors near centre; the rest fan out on a seeded ring.
      const seed = hash(a.attractor_id);
      const ring = i === 0 ? 0 : 0.34 + 0.05 * ((i - 1) % 3);
      const ang = (2 * Math.PI * i) / Math.max(sorted.length, 1) + seeded(seed) * 0.6;
      const x = cx + Math.cos(ang) * W * ring;
      const y = cy + Math.sin(ang) * H * ring;
      // Radius scales with convergence_rate (clamped for readability).
      const r = 46 + Math.min(1, Math.max(0, a.convergence_rate)) * 70;
      const color = colorForText(a.label, accent);
      // Spawn one faint star per member run, orbiting the well deterministically.
      const count = Math.min(a.member_run_ids?.length ?? 0, 60);
      const stars = Array.from({ length: count }, (_, s) => {
        const rs = hash(a.member_run_ids[s] ?? `${a.attractor_id}-${s}`);
        const oa = seeded(rs) * Math.PI * 2;
        const orbit = r * (1.15 + seeded(rs * 1.7) * 0.9);
        return {
          x: x + Math.cos(oa) * orbit,
          y: y + Math.sin(oa) * orbit,
          radius: 0.9 + seeded(rs * 2.3) * 1.6,
          phase: seeded(rs * 3.1) * Math.PI * 2, // twinkle offset
          orbit,
          base: oa, // starting orbital angle
        };
      });
      return { a, x, y, r, color, stars };
    });
  }, [discovery.attractors, accent]);

  // --- Deterministic chain arcs (top ~8 by causal weight) -------------------
  const arcs = useMemo(() => {
    const chains = [...(discovery.hidden_causal_chains ?? [])]
      .sort((a, b) => b.causal_weight - a.causal_weight)
      .slice(0, 8);
    return chains.map((c, i) => {
      const seed = hash(c.chain_id);
      // Endpoints seeded along the canvas edges; control point bows the arc.
      const y0 = H * (0.12 + seeded(seed) * 0.76);
      const y1 = H * (0.12 + seeded(seed * 1.9) * 0.76);
      const midY = H * (0.1 + seeded(seed * 2.7) * 0.8);
      const x0 = W * 0.04;
      const x1 = W * 0.96;
      const path = `M ${x0} ${y0} Q ${W / 2} ${midY} ${x1} ${y1}`;
      const color = colorForText(c.terminal_outcome, accent);
      const width = 1 + Math.min(1, Math.max(0, c.causal_weight)) * 5;
      const opacity = 0.18 + Math.min(1, Math.max(0, c.frequency)) * 0.55;
      return { c, path, color, width, opacity, key: c.chain_id || `chain-${i}` };
    });
  }, [discovery.hidden_causal_chains, accent]);

  // --- Twinkle / orbit animation (refs only; no re-render churn) -------------
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (reduceMotion) return; // static positions when motion is reduced
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const svg = svgRef.current;
      if (svg) {
        // Twinkle: modulate star opacity; gentle orbital drift on transforms.
        const stars = svg.querySelectorAll<SVGCircleElement>('[data-star]');
        stars.forEach((el) => {
          const ph = Number(el.getAttribute('data-phase')) || 0;
          const op = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.6 + ph));
          el.setAttribute('opacity', op.toFixed(3));
        });
        const orbits = svg.querySelectorAll<SVGGElement>('[data-orbit]');
        orbits.forEach((g) => {
          const spd = Number(g.getAttribute('data-orbit')) || 0;
          g.setAttribute('transform', `rotate(${(t * spd) % 360} ${g.getAttribute('data-cx')} ${g.getAttribute('data-cy')})`);
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reduceMotion, wells]);

  // Escape key closes the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const chokePoints = discovery.choke_points ?? [];
  const butterflies = discovery.butterfly_events ?? [];
  const singularities = discovery.singularities ?? [];
  const paradoxes = discovery.causal_paradoxes ?? [];
  const graphNodeCount = graph?.nodes?.length ?? 0;
  const graphEdgeCount = graph?.edges?.length ?? 0;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col text-gray-200 font-sans"
      style={{ backgroundColor: '#0A0A0F' }}
      role="dialog"
      aria-modal="true"
      aria-label="Constellation of Futures"
    >
      {/* ---------------------------------------------------------------- Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: `${accent}33` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>{lens?.icon ?? '✦'}</span>
          <div>
            <h1 className="text-xl font-light tracking-wide text-white">Constellation of Futures</h1>
            <p className="text-xs font-mono" style={{ color: accent }}>
              {lens?.label ?? 'Default Lens'} · {wells.length} attractor{wells.length === 1 ? '' : 's'} ·{' '}
              {arcs.length} causal filament{arcs.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md text-sm font-mono border transition-colors hover:bg-white/5"
          style={{ borderColor: `${accent}66`, color: accent }}
        >
          Exit ✕
        </button>
      </header>

      {/* --------------------------------------------------------- Body: map + panel */}
      <div className="flex flex-1 min-h-0">
        {/* --- Constellation canvas ------------------------------------------ */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          {wells.length === 0 ? (
            // Empty / calm state when no basins were discovered.
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
              <div
                className="w-40 h-40 rounded-full mb-6 animate-pulse"
                style={{ background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)` }}
              />
              <h2 className="text-2xl font-light text-white mb-2">No dominant attractors</h2>
              <p className="text-sm text-gray-500 max-w-md">
                The discovered futures did not converge into stable basins. The reality space
                remains diffuse. No gravity wells formed from these {term}s.
              </p>
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Per-well radial glow gradients. */}
                {wells.map((w) => (
                  <radialGradient key={`g-${w.a.attractor_id}`} id={`well-${w.a.attractor_id}`}>
                    <stop offset="0%" stopColor={w.color} stopOpacity="0.9" />
                    <stop offset="40%" stopColor={w.color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={w.color} stopOpacity="0" />
                  </radialGradient>
                ))}
                <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Causal-chain filaments (drawn beneath the wells). */}
              <g>
                {arcs.map((arc) => {
                  const active = hoverChain?.chain_id === arc.c.chain_id;
                  return (
                    <path
                      key={arc.key}
                      d={arc.path}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth={active ? arc.width + 2 : arc.width}
                      strokeLinecap="round"
                      opacity={active ? Math.min(1, arc.opacity + 0.35) : arc.opacity}
                      filter={active ? 'url(#soft-glow)' : undefined}
                      style={{ cursor: 'pointer', transition: 'opacity 160ms, stroke-width 160ms' }}
                      onMouseEnter={() => setHoverChain(arc.c)}
                      onMouseLeave={() => setHoverChain((c) => (c === arc.c ? null : c))}
                    />
                  );
                })}
              </g>

              {/* Attractor wells + orbiting stars. */}
              {wells.map((w) => (
                <g key={w.a.attractor_id}>
                  {/* Orbiting run-stars (rotated as a group for cheap orbit anim). */}
                  <g
                    data-orbit={reduceMotion ? undefined : (seeded(hash(w.a.attractor_id)) * 6 + 2).toFixed(2)}
                    data-cx={w.x}
                    data-cy={w.y}
                  >
                    {w.stars.map((s, i) => (
                      <circle
                        key={i}
                        data-star
                        data-phase={s.phase.toFixed(3)}
                        cx={s.x}
                        cy={s.y}
                        r={s.radius}
                        fill={w.color}
                        opacity={0.5}
                      />
                    ))}
                  </g>

                  {/* Gravity-well disc. */}
                  <circle
                    cx={w.x}
                    cy={w.y}
                    r={w.r}
                    fill={`url(#well-${w.a.attractor_id})`}
                    stroke={w.color}
                    strokeOpacity={0.5}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoverWell(w.a)}
                    onMouseLeave={() => setHoverWell((a) => (a === w.a ? null : a))}
                  />
                  <circle cx={w.x} cy={w.y} r={4} fill={w.color} filter="url(#soft-glow)" />

                  {/* Labels. */}
                  <text
                    x={w.x}
                    y={w.y + w.r + 16}
                    textAnchor="middle"
                    fontSize="13"
                    fill="#fff"
                    fontWeight={600}
                  >
                    {label(w.a.label)}
                  </text>
                  <text
                    x={w.x}
                    y={w.y + w.r + 32}
                    textAnchor="middle"
                    fontSize="11"
                    fill={w.color}
                    fontFamily="monospace"
                  >
                    {(w.a.convergence_rate * 100).toFixed(0)}% · det. by tick {w.a.earliest_deterministic_tick}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>

        {/* --- Inspector panel (internal scroll — never overflows page) ------ */}
        <aside
          className="w-80 shrink-0 border-l overflow-y-auto"
          style={{ borderColor: `${accent}33`, backgroundColor: '#0C0C14' }}
        >
          <div className="p-5 space-y-6">
            {/* Contextual inspector: hovered chain, else hovered well, else stats. */}
            {hoverChain ? (
              <ChainInspector chain={hoverChain} label={label} accent={accent} />
            ) : hoverWell ? (
              <WellInspector well={hoverWell} label={label} accent={accent} />
            ) : (
              <div>
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-2">Reality Map</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Hover a gravity-well to inspect its Reality DNA, or a filament to trace a hidden
                  causal chain across the discovered {term}s.
                </p>
              </div>
            )}

            {/* Anomaly stat rows — always visible, scrollable. */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Phenomena</h3>
              <div className="space-y-2">
                <StatRow label="Choke points" value={chokePoints.length} accent={accent} />
                <StatRow label="Butterfly events" value={butterflies.length} accent={accent} />
                <StatRow label="Singularities" value={singularities.length} accent={accent} />
                <StatRow label="Causal paradoxes" value={paradoxes.length} accent={accent} />
                {graph && (
                  <StatRow label="Causal graph" value={`${graphNodeCount}n / ${graphEdgeCount}e`} accent={accent} />
                )}
              </div>
            </div>

            {/* Choke-point detail rows. */}
            {chokePoints.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Choke Points</h3>
                <div className="space-y-2">
                  {chokePoints.slice(0, 12).map((cp) => (
                    <div
                      key={cp.choke_point_id}
                      className="flex items-center justify-between text-xs font-mono px-3 py-2 rounded-md"
                      style={{ backgroundColor: `${accent}12` }}
                    >
                      <span className="text-gray-300 truncate mr-2">tick {cp.tick}</span>
                      <span style={{ color: accent }}>
                        {(cp.intervention_efficacy * 100).toFixed(0)}% eff.
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outcome distribution mini-legend. */}
            {Object.keys(discovery.outcome_distribution ?? {}).length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Outcome Spread</h3>
                <div className="space-y-2">
                  {Object.entries(discovery.outcome_distribution).map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-300 truncate mr-2">{label(k)}</span>
                        <span className="font-mono text-gray-500">{(v * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, v * 100)}%`,
                            backgroundColor: colorForText(k, accent),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

// --- Sub-components -----------------------------------------------------------

// A compact key/value stat row used in the inspector.
const StatRow: React.FC<{ label: string; value: number | string; accent: string }> = ({
  label,
  value,
  accent,
}) => (
  <div
    className="flex items-center justify-between text-sm px-3 py-2 rounded-md"
    style={{ backgroundColor: `${accent}10` }}
  >
    <span className="text-gray-400">{label}</span>
    <span className="font-mono font-semibold" style={{ color: accent }}>
      {value}
    </span>
  </div>
);

// Inspector body for a hovered causal chain — shows the agent:action sequence.
const ChainInspector: React.FC<{ chain: Chain; label: (k: string) => string; accent: string }> = ({
  chain,
  label,
  accent,
}) => {
  const color = colorForText(chain.terminal_outcome, accent);
  return (
    <div>
      <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-2">Hidden Causal Chain</h3>
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm text-white font-medium">{label(chain.terminal_outcome)}</span>
      </div>
      <div className="flex gap-4 text-xs font-mono mb-3">
        <span className="text-gray-500">
          weight <span style={{ color: accent }}>{chain.causal_weight.toFixed(2)}</span>
        </span>
        <span className="text-gray-500">
          freq <span style={{ color: accent }}>{(chain.frequency * 100).toFixed(0)}%</span>
        </span>
      </div>
      {/* Ordered event sequence. */}
      <ol className="space-y-1.5">
        {chain.events.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className="font-mono text-gray-600 mt-0.5">{i + 1}.</span>
            <span className="text-gray-300">
              <span style={{ color }}>{e.agent_type}</span>
              <span className="text-gray-600"> · </span>
              <span className="text-gray-400">{e.action}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

// Inspector body for a hovered attractor well — shows DNA centroid as tiny bars.
const WellInspector: React.FC<{ well: Attractor; label: (k: string) => string; accent: string }> = ({
  well,
  label,
  accent,
}) => {
  const color = colorForText(well.label, accent);
  const dna = Object.entries(well.dna_centroid ?? {});
  const max = Math.max(1e-6, ...dna.map(([, v]) => Math.abs(v)));
  return (
    <div>
      <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-2">Attractor Basin</h3>
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm text-white font-medium">{label(well.label)}</span>
      </div>
      <div className="flex gap-4 text-xs font-mono mb-4">
        <span className="text-gray-500">
          conv <span style={{ color: accent }}>{(well.convergence_rate * 100).toFixed(0)}%</span>
        </span>
        <span className="text-gray-500">
          runs <span style={{ color: accent }}>{well.member_run_ids?.length ?? 0}</span>
        </span>
      </div>
      <h4 className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">Reality DNA centroid</h4>
      <div className="space-y-1.5">
        {dna.length === 0 && <p className="text-xs text-gray-600">No DNA signature.</p>}
        {dna.map(([k, v]) => (
          <div key={k} className="text-xs">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-gray-400 truncate mr-2">{k}</span>
              <span className="font-mono text-gray-600">{v.toFixed(2)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(Math.abs(v) / max) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OutcomeConstellation;
