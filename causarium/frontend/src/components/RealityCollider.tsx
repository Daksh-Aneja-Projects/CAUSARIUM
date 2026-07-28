import React, { useEffect, useRef, useState } from 'react';

/**
 * Reality Collider - a living field of many timelines.
 *
 * The frame is filled with free-drifting particles (each a thread of the ongoing
 * futures) plus the scenario's actors as labelled anchors. Everything moves
 * continuously; nearby points connect with thin lines that form and break as the
 * field flows, so the "relevant dots" are found and linked live. Every streamed
 * interaction lights a link between actors and injects fresh particles, and each
 * finished timeline drifts into the outcome it produced. Only the boundary is
 * fixed, positions are never hardcoded and the motion never stops.
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
const FIELD_N = 80;

function hash(s: string): number { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }
function short(t: string): string { return t.length > 16 ? t.slice(0, 15) + '…' : t; }
function colorForOutcome(name: string, accent: string): string { return OUTCOME_COLORS[name] || PALETTE[hash(name) % PALETTE.length] || accent; }

interface Pt { x: number; y: number; vx: number; vy: number; c: string; life: number; anchor?: boolean; key?: string; label?: string; flare?: number; }
interface Link { a: number; b: number; t0: number; dur: number; color: string; } // transient interaction glows (by anchor index)
interface Mote { x: number; y: number; vx: number; vy: number; toKey: string | null; c: string; }

export const RealityCollider: React.FC<RealityColliderProps> = ({ events, status, progress, outcomes, running, paused, lens }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursor = useRef(0);
  const field = useRef<Pt[]>([]);
  const anchors = useRef<Map<string, Pt>>(new Map());
  const links = useRef<Link[]>([]);
  const motes = useRef<Mote[]>([]);
  const rings = useRef<{ x: number; y: number; t0: number; dur: number }[]>([]);
  const size = useRef({ w: 1200, h: 800 });
  const reduced = useRef(false);
  const accent = useRef('#6C63FF');
  const pausedRef = useRef(false);
  const [hud, setHud] = useState({ tick: 0, actors: 0 });
  accent.current = lens?.accent ?? '#6C63FF';
  pausedRef.current = !!paused;

  const spawnField = (n: number, x?: number, y?: number, c?: string) => {
    const { w, h } = size.current;
    for (let i = 0; i < n; i++) {
      field.current.push({
        x: x ?? Math.random() * w, y: y ?? Math.random() * h,
        vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2,
        c: c ?? accent.current, life: 1,
      });
    }
    if (field.current.length > 260) field.current.splice(0, field.current.length - 260);
  };
  const ensureAnchor = (key: string, label: string) => {
    if (anchors.current.has(key)) return;
    const { w, h } = size.current; const seed = hash(key + label);
    anchors.current.set(key, {
      x: w * (0.2 + (seed % 60) / 100), y: h * (0.2 + ((seed >> 4) % 60) / 100),
      vx: 0, vy: 0, c: (key === 'env' || key === 'shock') ? '#8892B0' : PALETTE[hash(label) % PALETTE.length],
      life: 1, anchor: true, key, label: short(label), flare: 0,
    });
  };

  // ingest
  useEffect(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    let tick = hud.tick;
    for (let i = cursor.current; i < events.length; i++) {
      const raw = events[i]?.raw || {}; const rt = raw.type ?? events[i]?.type ?? '';
      if (rt === 'agents' && Array.isArray(raw.agents)) {
        for (const a of raw.agents) ensureAnchor(String(a.slot), String(a.type ?? 'Actor'));
        ensureAnchor('env', 'Environment'); ensureAnchor('shock', 'Shock');
        if (field.current.length < FIELD_N) spawnField(FIELD_N - field.current.length);
      } else if (rt === 'interactions' && Array.isArray(raw.links)) {
        const keys = Array.from(anchors.current.keys());
        for (const l of raw.links) {
          const s = l.s === 'shock' ? 'shock' : String(l.s);
          const src = anchors.current.get(s);
          const coop = COOP.has(String(l.action ?? '').toUpperCase());
          const color = l.agg ? '#FF3366' : coop ? '#00E5A0' : accent.current;
          if (src) { src.flare = now + 360; spawnField(2, src.x, src.y, color); }
          const tgt = l.t === 'all' ? null : (l.t === 'env' ? 'env' : String(l.t));
          const ai = keys.indexOf(s);
          if (tgt) { const bi = keys.indexOf(tgt); if (ai >= 0 && bi >= 0) links.current.push({ a: ai, b: bi, t0: now, dur: 700, color }); }
        }
        if (links.current.length > 200) links.current.splice(0, links.current.length - 200);
      } else if (rt === 'tick') {
        tick = raw.tick ?? tick;
        if (raw.black_swan) rings.current.push({ x: size.current.w / 2, y: size.current.h / 2, t0: now, dur: 1100 });
      } else if (rt === 'run_complete') {
        const outcome = String(raw.outcome ?? ''); const col = colorForOutcome(outcome, accent.current);
        let toKey: string | null = null;
        anchors.current.forEach((n, k) => { if (n.label === short(outcome) || n.label === outcome) toKey = k; });
        motes.current.push({ x: Math.random() * size.current.w, y: size.current.h, vx: 0, vy: 0, toKey, c: col });
        if (motes.current.length > 200) motes.current.splice(0, motes.current.length - 200);
      }
    }
    cursor.current = events.length;
    if (tick !== hud.tick || anchors.current.size !== hud.actors) setHud({ tick, actors: anchors.current.size });
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
      if (field.current.length === 0) spawnField(FIELD_N);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(wrapRef.current!);

    const draw = () => {
      const { w, h } = size.current;
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      const slow = pausedRef.current ? 0.25 : 1;
      const cx = w / 2, cy = h / 2, pad = 30;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = reduced.current ? '#0A0A0F' : 'rgba(10,10,15,0.24)';
      ctx.fillRect(0, 0, w, h);

      // move field particles (free drift, wrap)
      for (const p of field.current) {
        if (!reduced.current) { p.vx += (Math.random() - 0.5) * 0.12; p.vy += (Math.random() - 0.5) * 0.12; p.vx *= 0.97; p.vy *= 0.97; }
        p.x += p.vx * slow; p.y += p.vy * slow;
        if (p.x < 0) p.x += w; if (p.x > w) p.x -= w; if (p.y < 0) p.y += h; if (p.y > h) p.y -= h;
      }
      // move anchors (free flow within bounds: repel + gentle center + drift)
      const arr = Array.from(anchors.current.values());
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j]; let dx = a.x - b.x, dy = a.y - b.y; let d2 = dx * dx + dy * dy || 1;
          if (d2 < 60000) { const f = 2200 / d2, d = Math.sqrt(d2), fx = (dx / d) * f, fy = (dy / d) * f; a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy; }
        }
        a.vx += (cx - a.x) * 0.001; a.vy += (cy - a.y) * 0.001;
        if (!reduced.current) { a.vx += (Math.random() - 0.5) * 0.5; a.vy += (Math.random() - 0.5) * 0.5; }
      }
      for (const a of arr) {
        a.vx *= 0.9; a.vy *= 0.9;
        const sp = Math.hypot(a.vx, a.vy); if (sp > 2.6) { a.vx = a.vx / sp * 2.6; a.vy = a.vy / sp * 2.6; }
        a.x += a.vx * slow; a.y += a.vy * slow;
        if (a.x < pad) { a.x = pad; a.vx = Math.abs(a.vx) * 0.6; } if (a.x > w - pad) { a.x = w - pad; a.vx = -Math.abs(a.vx) * 0.6; }
        if (a.y < pad) { a.y = pad; a.vy = Math.abs(a.vy) * 0.6; } if (a.y > h - pad) { a.y = h - pad; a.vy = -Math.abs(a.vy) * 0.6; }
      }

      // proximity connections across ALL points -> the field finds & links relevant dots
      const all = field.current.concat(arr);
      const LINK = 118;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const dx = all[i].x - all[j].x, dy = all[i].y - all[j].y; const d = Math.hypot(dx, dy);
          if (d < LINK) {
            const bothField = !all[i].anchor && !all[j].anchor;
            ctx.globalAlpha = (1 - d / LINK) * (bothField ? 0.10 : 0.22);
            ctx.strokeStyle = all[i].anchor ? all[i].c : all[j].anchor ? all[j].c : accent.current;
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(all[i].x, all[i].y); ctx.lineTo(all[j].x, all[j].y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      // transient interaction glows between actors
      links.current = links.current.filter(L => {
        const a = arr[L.a], b = arr[L.b]; if (!a || !b) return false;
        const t = (now - L.t0) / L.dur; if (t >= 1) return false;
        ctx.strokeStyle = L.color + Math.round((1 - t) * 200).toString(16).padStart(2, '0');
        ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const e = t, x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
        ctx.fillStyle = L.color; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
        return true;
      });

      // motes to outcomes
      motes.current = motes.current.filter(m => {
        const target = m.toKey ? anchors.current.get(m.toKey) : null;
        const tx = target ? target.x : cx, ty = target ? target.y : cy;
        m.vx += (tx - m.x) * 0.02; m.vy += (ty - m.y) * 0.02; m.vx *= 0.9; m.vy *= 0.9; m.x += m.vx; m.y += m.vy;
        ctx.fillStyle = m.c; ctx.beginPath(); ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2); ctx.fill();
        return Math.hypot(tx - m.x, ty - m.y) > 8;
      });

      // shockwaves
      rings.current = rings.current.filter(r => {
        const t = (now - r.t0) / r.dur; if (t >= 1) return false;
        ctx.strokeStyle = '#FF3366' + Math.round((1 - t) * 160).toString(16).padStart(2, '0');
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, t * Math.max(w, h) * 0.5, 0, Math.PI * 2); ctx.stroke();
        return true;
      });

      // field dots
      ctx.globalCompositeOperation = 'lighter';
      for (const p of field.current) { ctx.fillStyle = p.c; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;

      // anchors (labelled actors)
      for (const a of arr) {
        const flaring = a.flare && now < a.flare; const rr = 5 + (flaring ? 4 : 0);
        const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, rr * 3.5); g.addColorStop(0, a.c); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, rr * 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = a.c; ctx.beginPath(); ctx.arc(a.x, a.y, rr, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(230,232,240,0.9)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(a.label ?? '', a.x, a.y + rr + 12);
        ctx.globalCompositeOperation = 'lighter';
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

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
      {Object.keys(outcomes).length > 0 && (
        <div className="absolute bottom-4 left-5 flex flex-col gap-1 pointer-events-none">
          {Object.entries(outcomes).sort((a, b) => b[1] - a[1]).map(([o, n]) => (
            <span key={o} className="text-[10px] font-mono flex items-center gap-1.5" style={{ color: colorForOutcome(o, accent.current) }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: colorForOutcome(o, accent.current) }} />{lens?.outcome_vocab?.[o] ?? o} · {n}
            </span>
          ))}
        </div>
      )}
      {!running && hud.actors === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-mono text-sm">Awaiting reality collision</div>
      )}
    </div>
  );
};

export default RealityCollider;
