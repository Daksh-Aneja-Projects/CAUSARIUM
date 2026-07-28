import React, { useEffect, useRef } from 'react';

/**
 * Reality Collider - a free-flowing live field.
 *
 * The scenario's actors are particles that float FREELY inside the frame (mutual
 * repulsion + gentle centering + Brownian drift + soft boundary bounce) - only
 * the boundaries are fixed, positions are never hardcoded. As the simulation
 * streams, glowing particles travel between actors to show who acts on whom, a
 * relationship web accretes and decays, and each finished timeline sends a mote
 * drifting into the future it produced. Everything is driven by the stream.
 */

interface StreamEvent { type: string; message?: string; timestamp: string; raw: any }
interface Lens { id: string; label: string; accent: string; icon: string; particle_term: string; outcome_vocab: Record<string, string> }
export interface RealityColliderProps {
  events: StreamEvent[]; status: string; progress: number;
  outcomes: Record<string, number>; running: boolean; paused?: boolean; lens?: Lens | null;
}

const OUTCOME_COLORS: Record<string, string> = {
  SYSTEMIC_COLLAPSE: '#FF3366', CONFLICT_ESCALATION: '#FF7A45', MONOPOLY_CAPTURE: '#FFB800',
  DISRUPTIVE_INNOVATION: '#B36CFF', STABLE_COOPERATION: '#00E5A0', FRAGMENTED_STALEMATE: '#00D9FF',
};
const PALETTE = ['#6C63FF', '#00D9FF', '#FF3366', '#FFB800', '#00E5A0', '#B36CFF', '#FF7A45'];
const COOP = new Set(['COOPERATE', 'FORM_ALLIANCE', 'NEGOTIATE', 'DE_ESCALATE']);
const MAX_PULSES = 600;

function hash(s: string): number { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }
function short(t: string): string { return t.length > 16 ? t.slice(0, 15) + '…' : t; }
function colorForOutcome(name: string, accent: string): string {
  if (OUTCOME_COLORS[name]) return OUTCOME_COLORS[name];
  return PALETTE[hash(name) % PALETTE.length] || accent;
}

interface Node { key: string; label: string; color: string; x: number; y: number; vx: number; vy: number; r: number; flare: number; red: number; }
interface Pulse { from: string; to: string; t0: number; dur: number; color: string; }
interface Ring { x: number; y: number; t0: number; dur: number; color: string; }
interface Mote { x: number; y: number; vx: number; vy: number; toKey: string | null; color: string; }

export const RealityCollider: React.FC<RealityColliderProps> = ({ events, status, progress, outcomes, running, paused, lens }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursor = useRef(0);
  const nodes = useRef<Map<string, Node>>(new Map());
  const pulses = useRef<Pulse[]>([]);
  const edges = useRef<Map<string, { w: number; color: string }>>(new Map());
  const rings = useRef<Ring[]>([]);
  const motes = useRef<Mote[]>([]);
  const size = useRef({ w: 1200, h: 800 });
  const reduced = useRef(false);
  const tickRef = useRef(0);
  const accent = useRef('#6C63FF');
  const pausedRef = useRef(false);
  accent.current = lens?.accent ?? '#6C63FF';
  pausedRef.current = !!paused;

  const ensure = (key: string, label: string): Node => {
    let n = nodes.current.get(key);
    if (n) return n;
    const { w, h } = size.current;
    const seed = hash(key + label);
    const special = key === 'env' || key === 'shock';
    n = {
      key, label: short(label),
      color: special ? '#8892B0' : PALETTE[hash(label) % PALETTE.length],
      // random spawn inside the frame; free from there
      x: w * (0.2 + ((seed % 60) / 100)), y: h * (0.2 + (((seed >> 4) % 60) / 100)),
      vx: (((seed % 7) - 3) / 3), vy: (((seed >> 3) % 7 - 3) / 3),
      r: special ? 4 : 5, flare: 0, red: 0,
    };
    nodes.current.set(key, n);
    return n;
  };
  const ekey = (a: string, b: string) => a < b ? a + '|' + b : b + '|' + a;
  const bump = (a: string, b: string, color: string) => {
    if (a === b) return;
    const k = ekey(a, b); const e = edges.current.get(k);
    if (e) { e.w = Math.min(1.8, e.w + 0.45); e.color = color; } else edges.current.set(k, { w: 0.5, color });
  };
  const pulse = (from: string, to: string, color: string, now: number) => {
    if (!nodes.current.has(from) || !nodes.current.has(to)) return;
    pulses.current.push({ from, to, t0: now, dur: 650 + Math.random() * 350, color });
    if (pulses.current.length > MAX_PULSES) pulses.current.splice(0, pulses.current.length - MAX_PULSES);
  };

  // ingest
  useEffect(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    for (let i = cursor.current; i < events.length; i++) {
      const raw = events[i]?.raw || {}; const rt = raw.type ?? events[i]?.type ?? '';
      if (rt === 'agents' && Array.isArray(raw.agents)) {
        for (const a of raw.agents) ensure(String(a.slot), String(a.type ?? 'Actor'));
        ensure('env', 'Environment'); ensure('shock', 'Shock');
      } else if (rt === 'interactions' && Array.isArray(raw.links)) {
        for (const l of raw.links) {
          const s = l.s === 'shock' ? 'shock' : String(l.s);
          const src = nodes.current.get(s);
          const coop = COOP.has(String(l.action ?? '').toUpperCase());
          const color = l.agg ? '#FF3366' : coop ? '#00E5A0' : accent.current;
          if (src) src.flare = now + 380;
          if (l.t === 'all') { nodes.current.forEach((_, k) => { if (k !== 'shock') { pulse('shock', k, color, now); bump('shock', k, color); } }); }
          else { const t = l.t === 'env' ? 'env' : String(l.t); pulse(s, t, color, now); bump(s, t, color); }
        }
      } else if (rt === 'tick') {
        tickRef.current = raw.tick ?? tickRef.current;
        if (raw.black_swan) {
          rings.current.push({ x: size.current.w / 2, y: size.current.h / 2, t0: now, dur: 1100, color: '#FF3366' });
          nodes.current.forEach(n => { n.red = now + 500; });
        }
      } else if (rt === 'run_complete') {
        // a finished timeline drifts into the future it produced
        const outcome = String(raw.outcome ?? '');
        const col = colorForOutcome(outcome, accent.current);
        let toKey: string | null = null;
        nodes.current.forEach((n, k) => { if (n.label === short(outcome) || n.label === outcome) toKey = k; });
        motes.current.push({ x: size.current.w / 2, y: size.current.h / 2, vx: 0, vy: 0, toKey, color: col });
        if (motes.current.length > 240) motes.current.splice(0, motes.current.length - 240);
      }
    }
    cursor.current = events.length;
  }, [events.length]);

  // physics + render
  useEffect(() => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const canvas = canvasRef.current!, ctx = canvas.getContext('2d')!;
    let raf = 0;
    const fit = () => {
      const r = wrapRef.current!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: r.width, h: r.height };
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(wrapRef.current!);

    const step = () => {
      const { w, h } = size.current;
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      const pad = 60, cx = w / 2, cy = h / 2;
      const slow = pausedRef.current ? 0.25 : 1;
      const arr = Array.from(nodes.current.values());

      // free-flow forces
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        // mutual repulsion (spread out)
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j];
          let dx = a.x - b.x, dy = a.y - b.y; let d2 = dx * dx + dy * dy || 1;
          if (d2 < 90000) { const f = 2600 / d2; const d = Math.sqrt(d2); const fx = (dx / d) * f, fy = (dy / d) * f; a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy; }
        }
        // gentle pull to center so they roam but stay in view
        a.vx += (cx - a.x) * 0.0009; a.vy += (cy - a.y) * 0.0009;
        // brownian drift -> free flow
        if (!reduced.current) { a.vx += (Math.random() - 0.5) * 0.7; a.vy += (Math.random() - 0.5) * 0.7; }
      }
      // integrate + soft boundary bounce
      for (const a of arr) {
        a.vx *= 0.9; a.vy *= 0.9;
        const sp = Math.hypot(a.vx, a.vy); if (sp > 3.2) { a.vx = a.vx / sp * 3.2; a.vy = a.vy / sp * 3.2; }
        a.x += a.vx * slow; a.y += a.vy * slow;
        if (a.x < pad) { a.x = pad; a.vx = Math.abs(a.vx) * 0.6; }
        if (a.x > w - pad) { a.x = w - pad; a.vx = -Math.abs(a.vx) * 0.6; }
        if (a.y < pad) { a.y = pad; a.vy = Math.abs(a.vy) * 0.6; }
        if (a.y > h - pad) { a.y = h - pad; a.vy = -Math.abs(a.vy) * 0.6; }
      }

      // trail fade
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = reduced.current ? '#0A0A0F' : 'rgba(10,10,15,0.26)';
      ctx.fillRect(0, 0, w, h);

      // persistent relationship web (decays)
      ctx.globalCompositeOperation = 'lighter';
      edges.current.forEach((e, k) => {
        e.w *= 0.985; if (e.w < 0.04) { edges.current.delete(k); return; }
        const [ka, kb] = k.split('|'); const a = nodes.current.get(ka), b = nodes.current.get(kb);
        if (!a || !b) return;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = e.color + '55'; ctx.lineWidth = Math.min(2, e.w); ctx.stroke();
      });

      // pulses travel between (moving) nodes -> live connections
      pulses.current = pulses.current.filter(p => {
        const a = nodes.current.get(p.from), b = nodes.current.get(p.to); if (!a || !b) return false;
        const t = (now - p.t0) / p.dur; if (t >= 1) return false;
        const e = 1 - (1 - t) * (1 - t);
        const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 6); g.addColorStop(0, p.color); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        if (t > 0.9) { ctx.strokeStyle = p.color + '66'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y, (t - 0.9) * 60, 0, Math.PI * 2); ctx.stroke(); }
        return true;
      });

      // timeline motes drift into the future they produced
      motes.current = motes.current.filter(m => {
        const target = m.toKey ? nodes.current.get(m.toKey) : null;
        const tx = target ? target.x : cx, ty = target ? target.y : cy - size.current.h * 0.35;
        m.vx += (tx - m.x) * 0.02; m.vy += (ty - m.y) * 0.02; m.vx *= 0.9; m.vy *= 0.9;
        m.x += m.vx; m.y += m.vy;
        ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2); ctx.fill();
        return Math.hypot(tx - m.x, ty - m.y) > 8;
      });

      // shockwaves
      rings.current = rings.current.filter(r => {
        const t = (now - r.t0) / r.dur; if (t >= 1) return false;
        ctx.beginPath(); ctx.arc(r.x, r.y, t * Math.max(w, h) * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = r.color + Math.round((1 - t) * 180).toString(16).padStart(2, '0'); ctx.lineWidth = 2; ctx.stroke();
        return true;
      });

      // nodes
      for (const a of arr) {
        const flaring = now < a.flare; const red = now < a.red;
        const rr = a.r + (flaring ? 4 : 0);
        const col = red ? '#FF3366' : a.color;
        const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, rr * 3.5);
        g.addColorStop(0, col); g.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, rr * 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(a.x, a.y, rr, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(230,232,240,0.85)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(a.label, a.x, a.y + rr + 12);
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const nodeCount = nodes.current.size;
  const term = lens?.particle_term ?? 'signals';
  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      <div className="absolute top-4 left-5 font-mono text-xs pointer-events-none select-none">
        <div className="text-white/90 tracking-wide">{lens ? lens.label : 'Reality Collider'}</div>
        <div className="mt-1 flex items-center gap-2 text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: paused ? '#FFB800' : accent.current }} />{status}
        </div>
        <div className="text-gray-600 mt-0.5">{nodeCount} actors · tick {tickRef.current}</div>
      </div>
      {Object.keys(outcomes).length > 0 && (
        <div className="absolute bottom-4 left-5 flex flex-col gap-1 pointer-events-none max-h-[40vh] flex-wrap">
          {Object.entries(outcomes).sort((a, b) => b[1] - a[1]).map(([o, n]) => (
            <span key={o} className="text-[10px] font-mono flex items-center gap-1.5" style={{ color: colorForOutcome(o, accent.current) }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: colorForOutcome(o, accent.current) }} />
              {lens?.outcome_vocab?.[o] ?? o} · {n}
            </span>
          ))}
        </div>
      )}
      {!running && nodeCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-mono text-sm">Awaiting reality collision</div>
      )}
    </div>
  );
};

export default RealityCollider;
