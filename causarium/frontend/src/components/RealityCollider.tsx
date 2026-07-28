import React, { useEffect, useRef, useState } from 'react';

/**
 * Reality Collider - a live field that BUILDS from the simulation.
 *
 * It starts empty. As the stream arrives, the scenario's actors appear as
 * labelled anchors and every interaction/timeline births drifting particles that
 * flow into the field; nearby points connect with thin lines, so the relevant
 * dots are selected and integrated live. Particles fade when activity quiets, so
 * the field always reflects what is happening now. Only the boundary is fixed -
 * positions are never hardcoded and the motion never stops.
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

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); };
const short = (t: string) => t.length > 16 ? t.slice(0, 15) + '…' : t;
const colorForOutcome = (o: string, a: string) => OUTCOME_COLORS[o] || PALETTE[hash(o) % PALETTE.length] || a;

interface Pt { x: number; y: number; vx: number; vy: number; c: string; life: number; }
interface Anchor { x: number; y: number; vx: number; vy: number; c: string; key: string; label: string; flare: number; }
interface Link { a: string; b: string; t0: number; dur: number; color: string; }
interface Mote { x: number; y: number; vx: number; vy: number; toKey: string | null; c: string; }

export const RealityCollider: React.FC<RealityColliderProps> = ({ events, status, progress, outcomes, running, paused, lens }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursor = useRef(0);
  const field = useRef<Pt[]>([]);
  const anchors = useRef<Map<string, Anchor>>(new Map());
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

  const born = (n: number, x: number, y: number, c: string) => {
    for (let i = 0; i < n; i++) field.current.push({
      x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.6, c, life: 1,
    });
    if (field.current.length > 340) field.current.splice(0, field.current.length - 340);
  };
  const ensure = (key: string, label: string) => {
    if (anchors.current.has(key)) return;
    const { w, h } = size.current; const seed = hash(key + label);
    anchors.current.set(key, {
      x: w * (0.25 + (seed % 50) / 100), y: h * (0.25 + ((seed >> 4) % 50) / 100),
      vx: 0, vy: 0, c: (key === 'env' || key === 'shock') ? '#8892B0' : PALETTE[hash(label) % PALETTE.length],
      key, label: short(label), flare: 0,
    });
  };

  useEffect(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    let tick = hud.tick;
    for (let i = cursor.current; i < events.length; i++) {
      const raw = events[i]?.raw || {}; const rt = raw.type ?? events[i]?.type ?? '';
      if (rt === 'agents' && Array.isArray(raw.agents)) {
        for (const a of raw.agents) ensure(String(a.slot), String(a.type ?? 'Actor'));
        ensure('env', 'Environment'); ensure('shock', 'Shock');
      } else if (rt === 'interactions' && Array.isArray(raw.links)) {
        for (const l of raw.links) {
          const s = l.s === 'shock' ? 'shock' : String(l.s);
          const src = anchors.current.get(s);
          const coop = COOP.has(String(l.action ?? '').toUpperCase());
          const color = l.agg ? '#FF3366' : coop ? '#00E5A0' : accent.current;
          if (src) { src.flare = now + 340; born(3, src.x, src.y, color); }         // particles born live from activity
          const tgt = l.t === 'all' ? null : (l.t === 'env' ? 'env' : String(l.t));
          if (tgt && anchors.current.has(s) && anchors.current.has(tgt)) links.current.push({ a: s, b: tgt, t0: now, dur: 700, color });
        }
        if (links.current.length > 160) links.current.splice(0, links.current.length - 160);
      } else if (rt === 'tick') {
        tick = raw.tick ?? tick;
        if (raw.black_swan) rings.current.push({ x: size.current.w / 2, y: size.current.h / 2, t0: now, dur: 1100 });
      } else if (rt === 'run_complete') {
        const outcome = String(raw.outcome ?? ''); const col = colorForOutcome(outcome, accent.current);
        let toKey: string | null = null;
        anchors.current.forEach((n, k) => { if (n.label === short(outcome) || n.label === outcome) toKey = k; });
        motes.current.push({ x: Math.random() * size.current.w, y: size.current.h + 10, vx: 0, vy: 0, toKey, c: col });
        if (motes.current.length > 180) motes.current.splice(0, motes.current.length - 180);
      }
    }
    cursor.current = events.length;
    if (tick !== hud.tick || anchors.current.size !== hud.actors) setHud({ tick, actors: anchors.current.size });
  }, [events.length]);

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

    const draw = () => {
      const { w, h } = size.current;
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      const slow = pausedRef.current ? 0.25 : 1;
      const cx = w / 2, cy = h / 2, pad = 30;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = reduced.current ? '#0A0A0F' : 'rgba(10,10,15,0.22)';
      ctx.fillRect(0, 0, w, h);

      // field particles: drift, gentle centering, fade over ~3.5s
      field.current = field.current.filter(p => {
        p.life -= 0.006; if (p.life <= 0) return false;
        if (!reduced.current) { p.vx += (Math.random() - 0.5) * 0.1; p.vy += (Math.random() - 0.5) * 0.1; }
        p.vx += (cx - p.x) * 0.00015; p.vy += (cy - p.y) * 0.00015;
        p.vx *= 0.975; p.vy *= 0.975; p.x += p.vx * slow; p.y += p.vy * slow;
        if (p.x < 0) p.x = 0; if (p.x > w) p.x = w; if (p.y < 0) p.y = 0; if (p.y > h) p.y = h;
        return true;
      });

      // anchors free-flow
      const arr = Array.from(anchors.current.values());
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j]; let dx = a.x - b.x, dy = a.y - b.y; let d2 = dx * dx + dy * dy || 1;
          if (d2 < 55000) { const f = 2000 / d2, d = Math.sqrt(d2), fx = (dx / d) * f, fy = (dy / d) * f; a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy; }
        }
        a.vx += (cx - a.x) * 0.0011; a.vy += (cy - a.y) * 0.0011;
        if (!reduced.current) { a.vx += (Math.random() - 0.5) * 0.45; a.vy += (Math.random() - 0.5) * 0.45; }
      }
      for (const a of arr) {
        a.vx *= 0.9; a.vy *= 0.9; const sp = Math.hypot(a.vx, a.vy); if (sp > 2.4) { a.vx = a.vx / sp * 2.4; a.vy = a.vy / sp * 2.4; }
        a.x += a.vx * slow; a.y += a.vy * slow;
        if (a.x < pad) { a.x = pad; a.vx = Math.abs(a.vx) * 0.6; } if (a.x > w - pad) { a.x = w - pad; a.vx = -Math.abs(a.vx) * 0.6; }
        if (a.y < pad) { a.y = pad; a.vy = Math.abs(a.vy) * 0.6; } if (a.y > h - pad) { a.y = h - pad; a.vy = -Math.abs(a.vy) * 0.6; }
      }

      // proximity links (subtle) among particles + anchors
      const pts: { x: number; y: number; c: string; anchor: boolean }[] =
        field.current.map(p => ({ x: p.x, y: p.y, c: p.c, anchor: false }))
          .concat(arr.map(a => ({ x: a.x, y: a.y, c: a.c, anchor: true })));
      const LINK = 110;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y; const d = Math.hypot(dx, dy);
          if (d < LINK) {
            const withAnchor = pts[i].anchor || pts[j].anchor;
            ctx.globalAlpha = (1 - d / LINK) * (withAnchor ? 0.16 : 0.07);
            ctx.strokeStyle = pts[i].anchor ? pts[i].c : pts[j].anchor ? pts[j].c : accent.current;
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      // interaction glows
      links.current = links.current.filter(L => {
        const a = anchors.current.get(L.a), b = anchors.current.get(L.b); if (!a || !b) return false;
        const t = (now - L.t0) / L.dur; if (t >= 1) return false;
        ctx.strokeStyle = L.color + Math.round((1 - t) * 170).toString(16).padStart(2, '0');
        ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        ctx.fillStyle = L.color; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
        return true;
      });

      // motes into outcomes
      motes.current = motes.current.filter(m => {
        const target = m.toKey ? anchors.current.get(m.toKey) : null;
        const tx = target ? target.x : cx, ty = target ? target.y : cy;
        m.vx += (tx - m.x) * 0.02; m.vy += (ty - m.y) * 0.02; m.vx *= 0.9; m.vy *= 0.9; m.x += m.vx; m.y += m.vy;
        ctx.fillStyle = m.c; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(m.x, m.y, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        return Math.hypot(tx - m.x, ty - m.y) > 8;
      });

      // shockwaves
      rings.current = rings.current.filter(r => {
        const t = (now - r.t0) / r.dur; if (t >= 1) return false;
        ctx.strokeStyle = '#FF3366' + Math.round((1 - t) * 140).toString(16).padStart(2, '0');
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r.x, r.y, t * Math.max(w, h) * 0.5, 0, Math.PI * 2); ctx.stroke();
        return true;
      });

      // field dots (soft, low glow)
      for (const p of field.current) { ctx.fillStyle = p.c; ctx.globalAlpha = 0.5 * p.life; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;

      // anchors (labelled) - restrained glow
      for (const a of arr) {
        const flaring = a.flare && now < a.flare; const rr = 4.5 + (flaring ? 3 : 0);
        const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, rr * 2.2); g.addColorStop(0, a.c + 'cc'); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, rr * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = a.c; ctx.beginPath(); ctx.arc(a.x, a.y, rr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(230,232,240,0.9)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(a.label, a.x, a.y + rr + 12);
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
      {!running && hud.actors === 0 && field.current.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-mono text-sm">Press Simulate to collide the futures</div>
      )}
    </div>
  );
};

export default RealityCollider;
