import React, { useEffect, useRef, useState } from 'react';

/**
 * Reality Collider - a calm, structured field of the actual actors.
 *
 * The scenario's actors arrive from the stream and take an orbit: contenders on
 * the inner ring, forces on the outer one. Nothing is hardcoded and nothing is
 * random noise - every line drawn is a real interaction the engine reported, and
 * a single clean pulse travels it before it fades. Each contender wears a halo
 * whose radius grows with its share of the finished timelines, so the leading
 * future visibly dominates the field. Lots of negative space, restrained glow.
 */

interface StreamEvent { type: string; message?: string; timestamp: string; raw: any }
interface Lens { id: string; label: string; accent: string; icon: string; particle_term: string; outcome_vocab: Record<string, string> }
export interface RealityColliderProps {
  events: StreamEvent[]; status: string; progress: number;
  outcomes: Record<string, number>; running: boolean; paused?: boolean; lens?: Lens | null;
  contenders?: string[];
  /** Hide the bottom-left outcome legend when a Verdict already presents it. */
  hideOutcomes?: boolean;
}

const OUTCOME_COLORS: Record<string, string> = {
  SYSTEMIC_COLLAPSE: '#FF3366', CONFLICT_ESCALATION: '#FF7A45', MONOPOLY_CAPTURE: '#FFB800',
  DISRUPTIVE_INNOVATION: '#B36CFF', STABLE_COOPERATION: '#00E5A0', FRAGMENTED_STALEMATE: '#00D9FF',
};
const PALETTE = ['#6C63FF', '#00D9FF', '#00E5A0', '#B36CFF', '#FFB800', '#FF7A45', '#FF3366'];
const COOP = new Set(['COOPERATE', 'FORM_ALLIANCE', 'NEGOTIATE', 'DE_ESCALATE']);
const MUTED = '#7D86A8';

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); };
const short = (t: string) => (t.length > 18 ? t.slice(0, 17) + '…' : t);
const colorForOutcome = (o: string, a: string) => OUTCOME_COLORS[o] || PALETTE[hash(o) % PALETTE.length] || a;
const norm = (s: string) => s.trim().toLowerCase();

interface Node {
  key: string; name: string; label: string; color: string; contender: boolean;
  ang: number; radius: number; phase: number;      // orbit slot (assigned on layout)
  x: number; y: number;                            // resolved each frame
  flare: number;                                   // ms timestamp the node last acted
  halo: number;                                    // eased share of finished timelines
}
interface Pulse { a: string; b: string; t0: number; dur: number; color: string }

export const RealityCollider: React.FC<RealityColliderProps> = ({ events, status, outcomes, running, paused, lens, contenders, hideOutcomes }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursor = useRef(0);
  const nodes = useRef<Map<string, Node>>(new Map());
  const pulses = useRef<Pulse[]>([]);
  const swans = useRef<{ t0: number; dur: number }[]>([]);
  const size = useRef({ w: 1200, h: 800 });
  const reduced = useRef(false);
  const accent = useRef('#6C63FF');
  const pausedRef = useRef(false);
  const shares = useRef<Record<string, number>>({});
  const [hud, setHud] = useState({ tick: 0, actors: 0 });
  accent.current = lens?.accent ?? '#6C63FF';
  pausedRef.current = !!paused;

  const contenderSet = useRef<Set<string>>(new Set());
  contenderSet.current = new Set((contenders ?? []).map(norm));

  /** Assign every node an orbit slot: contenders inner, forces outer. */
  const layout = () => {
    const all = Array.from(nodes.current.values());
    const inner = all.filter(n => n.contender);
    const outer = all.filter(n => !n.contender);
    const place = (list: Node[], radius: number, offset: number) => {
      list.forEach((n, i) => {
        n.ang = offset + (i * Math.PI * 2) / Math.max(1, list.length);
        n.radius = radius;
      });
    };
    // With no contenders identified, everyone shares one clean ring.
    if (!inner.length) place(outer, 1, -Math.PI / 2);
    else { place(inner, 0.6, -Math.PI / 2); place(outer, 1, -Math.PI / 2 + Math.PI / Math.max(1, outer.length)); }
  };

  const ensure = (key: string, name: string) => {
    if (nodes.current.has(key)) return;
    const isC = contenderSet.current.has(norm(name));
    nodes.current.set(key, {
      key, name, label: short(name), contender: isC,
      color: key === 'shock' ? '#FF3366' : key === 'env' ? MUTED : isC ? colorForOutcome(name, accent.current) : MUTED,
      ang: 0, radius: 1, phase: (hash(key + name) % 628) / 100, x: 0, y: 0, flare: 0, halo: 0,
    });
    layout();
  };

  // --- ingest the stream --------------------------------------------------- #
  useEffect(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    let tick = hud.tick;
    for (let i = cursor.current; i < events.length; i++) {
      const raw = events[i]?.raw || {}; const rt = raw.type ?? events[i]?.type ?? '';
      if (rt === 'agents' && Array.isArray(raw.agents)) {
        for (const a of raw.agents) ensure(String(a.slot), String(a.type ?? 'Actor'));
        ensure('env', 'Environment');
      } else if (rt === 'interactions' && Array.isArray(raw.links)) {
        for (const l of raw.links) {
          if (l.swan) { swans.current.push({ t0: now, dur: 1400 }); continue; }
          const s = String(l.s);
          const src = nodes.current.get(s);
          if (!src) continue;
          src.flare = now;
          const tgt = l.t === 'all' ? null : (l.t === 'env' ? 'env' : String(l.t));
          if (!tgt || !nodes.current.has(tgt) || tgt === s) continue;
          const coop = COOP.has(String(l.action ?? '').toUpperCase());
          pulses.current.push({
            a: s, b: tgt, t0: now, dur: 900,
            color: l.agg ? '#FF3366' : coop ? '#00E5A0' : accent.current,
          });
        }
        if (pulses.current.length > 60) pulses.current.splice(0, pulses.current.length - 60);
      } else if (rt === 'tick') {
        tick = raw.tick ?? tick;
        if (raw.black_swan) swans.current.push({ t0: now, dur: 1400 });
      }
    }
    cursor.current = events.length;
    if (tick !== hud.tick || nodes.current.size !== hud.actors) setHud({ tick, actors: nodes.current.size });
  }, [events.length]);

  // --- outcome shares feed the halos --------------------------------------- #
  useEffect(() => {
    const total = Object.values(outcomes).reduce((a, b) => a + b, 0) || 1;
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(outcomes)) next[norm(k)] = v / total;
    shares.current = next;
  }, [outcomes]);

  // --- render -------------------------------------------------------------- #
  useEffect(() => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const canvas = canvasRef.current!, ctx = canvas.getContext('2d')!;
    let raf = 0;
    const fit = () => {
      const r = wrapRef.current!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: r.width, h: r.height };
      canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(wrapRef.current!);

    const draw = () => {
      const { w, h } = size.current;
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      const t = now / 1000;
      const cx = w / 2, cy = h / 2;
      const list = Array.from(nodes.current.values());
      const hasContenders = list.some(n => n.contender);
      // Keep every label and halo inside the frame at any width.
      const maxHalo = 32;
      const ring = Math.max(60, Math.min(w * 0.5 - maxHalo - 28, h * 0.5 - maxHalo - 34));

      ctx.clearRect(0, 0, w, h);

      // resolve positions: fixed orbit + a slow, tiny float
      const drift = reduced.current ? 0 : 1;
      for (const n of list) {
        const wob = Math.sin(t * 0.35 + n.phase) * 5 * drift;
        const a = n.ang + Math.sin(t * 0.12 + n.phase) * 0.035 * drift;
        const r = n.radius * ring + wob;
        n.x = cx + Math.cos(a) * r;
        n.y = cy + Math.sin(a) * r * 0.86;
        const target = shares.current[norm(n.name)] ?? 0;
        n.halo += (target - n.halo) * 0.06;             // ease toward the live share
      }

      // orbit guides - the only static geometry, barely there
      ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
      for (const r of hasContenders ? [0.5, 1] : [1]) {
        ctx.beginPath(); ctx.ellipse(cx, cy, ring * r, ring * r * 0.86, 0, 0, Math.PI * 2); ctx.stroke();
      }

      // black-swan shockwaves
      swans.current = swans.current.filter(s => {
        const p = (now - s.t0) / s.dur; if (p >= 1) return false;
        ctx.strokeStyle = `rgba(255,51,102,${(1 - p) * 0.4})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, p * ring * 1.6, p * ring * 1.38, 0, 0, Math.PI * 2); ctx.stroke();
        return true;
      });

      // real causal links: brighten, carry one pulse, fade
      const speed = pausedRef.current ? 0.3 : 1;
      pulses.current = pulses.current.filter(p => {
        const a = nodes.current.get(p.a), b = nodes.current.get(p.b);
        if (!a || !b) return false;
        const prog = ((now - p.t0) / p.dur) * speed; if (prog >= 1) return false;
        const env = Math.sin(prog * Math.PI);                    // in then out
        ctx.strokeStyle = p.color; ctx.globalAlpha = env * 0.42; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const x = a.x + (b.x - a.x) * prog, y = a.y + (b.y - a.y) * prog;
        ctx.globalAlpha = env; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      // nodes
      for (const n of list) {
        const share = n.contender ? n.halo : 0;
        if (share > 0.001) {
          const r = 15 + share * maxHalo;
          const g = ctx.createRadialGradient(n.x, n.y, r * 0.55, n.x, n.y, r);
          g.addColorStop(0, 'transparent'); g.addColorStop(1, n.color + '22');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = n.color + '4d'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.stroke();
          // share arc - the visible dominance of this future
          ctx.strokeStyle = n.color; ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(n.x, n.y, r, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2); ctx.stroke();
          ctx.lineCap = 'butt';
        }
        // a single ring pulse when this actor just acted
        const age = now - n.flare;
        if (n.flare && age < 620) {
          const p = age / 620;
          ctx.strokeStyle = n.color; ctx.globalAlpha = (1 - p) * 0.5; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(n.x, n.y, 7 + p * 16, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const rr = n.contender ? 5.5 : 3.5;
        ctx.fillStyle = n.color; ctx.globalAlpha = n.contender ? 1 : 0.75;
        ctx.beginPath(); ctx.arc(n.x, n.y, rr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        const lift = n.contender ? 15 + share * maxHalo : 0;
        ctx.font = n.contender ? '600 11px "Space Grotesk", system-ui, sans-serif' : '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = n.contender ? 'rgba(236,238,246,0.95)' : 'rgba(160,166,190,0.7)';
        ctx.fillText(n.label, n.x, n.y + rr + lift + 13);
        if (n.contender && share > 0.004) {
          ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.fillStyle = n.color;
          ctx.fillText(`${Math.round(share * 100)}%`, n.x, n.y + rr + lift + 25);
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const ranked = Object.entries(outcomes).sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((s, [, n]) => s + n, 0) || 1;

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      <div className="absolute top-4 left-5 font-mono text-xs pointer-events-none select-none">
        <div className="text-white/90 tracking-wide">{lens ? lens.label : 'Reality Collider'}</div>
        <div className="mt-1 flex items-center gap-2 text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: paused ? '#FFB800' : accent.current }} />{status}
        </div>
        <div className="text-gray-600 mt-0.5">{hud.actors} actors · tick {hud.tick}</div>
      </div>
      {ranked.length > 0 && !hideOutcomes && (
        <div className="absolute bottom-4 left-5 flex flex-col gap-1 pointer-events-none">
          {ranked.slice(0, 6).map(([o, n]) => (
            <span key={o} className="text-[10px] font-mono flex items-center gap-1.5" style={{ color: colorForOutcome(o, accent.current) }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: colorForOutcome(o, accent.current) }} />
              {lens?.outcome_vocab?.[o] ?? o} · {Math.round((n / total) * 100)}%
            </span>
          ))}
        </div>
      )}
      {!running && hud.actors === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-mono text-sm">Press Simulate to collide the futures</div>
      )}
    </div>
  );
};

export default RealityCollider;
