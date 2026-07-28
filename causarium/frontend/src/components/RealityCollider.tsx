import React, { useEffect, useRef } from 'react';

/**
 * Reality Collider - a LIVE force-directed network of the scenario's agents.
 *
 * Agent nodes float and drift continuously (repulsion + spring + Brownian jitter),
 * never frozen. As the simulation streams, pulse particles travel along edges to
 * show who is acting on whom in real time. Links illuminate and fade, nodes flare
 * when they act, and black swans burst as expanding shockwaves. Everything is
 * driven by streamed events - nothing about the topology is hardcoded.
 *
 * Sim state lives entirely in refs so the rAF loop never triggers React renders.
 */

interface StreamEvent { type: string; message?: string; timestamp: string; raw: any }
interface Lens { id: string; label: string; accent: string; icon: string; particle_term: string; outcome_vocab: Record<string, string> }
export interface RealityColliderProps {
  events: StreamEvent[];
  status: string;
  progress: number;
  outcomes: Record<string, number>;
  running: boolean;
  paused?: boolean;
  lens?: Lens | null;
}

// ---- constants (inline) ----------------------------------------------------
const BG = '#0A0A0F';
const OUTCOME_COLORS: Record<string, string> = {
  SYSTEMIC_COLLAPSE: '#FF3366', CONFLICT_ESCALATION: '#FF7A45', MONOPOLY_CAPTURE: '#FFB800',
  DISRUPTIVE_INNOVATION: '#B36CFF', STABLE_COOPERATION: '#00E5A0', FRAGMENTED_STALEMATE: '#00D9FF',
};
const AGENT_PALETTE = ['#6C63FF', '#00D9FF', '#FF3366', '#FFB800', '#00E5A0', '#B36CFF', '#FF7A45'];
const COOP = new Set(['COOPERATE', 'FORM_ALLIANCE', 'NEGOTIATE', 'DE_ESCALATE']);
const COOP_COLOR = '#00E5A0';
const MAX_PULSES = 500;

// ---- helpers ---------------------------------------------------------------
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Humanize raw agent type codes into short, readable labels.
const HUMANIZE: Record<string, string> = {
  EXECUTIVE_CEO: 'CEO', REGULATOR_DOMESTIC: 'Regulator', REGULATOR_FOREIGN: 'Foreign Reg',
  MEDIA_SOCIAL: 'Social Media', MEDIA_PRESS: 'Press', COMPETITOR_DIRECT: 'Competitor',
  COMPETITOR_ADJACENT: 'Rival', INVESTOR_INSTITUTIONAL: 'Investors', INVESTOR_RETAIL: 'Retail',
  CUSTOMER_ENTERPRISE: 'Customers', CUSTOMER_CONSUMER: 'Consumers', SUPPLIER_KEY: 'Supplier',
  EMPLOYEE_UNION: 'Union', PARTNER_STRATEGIC: 'Partner', ACTIVIST_NGO: 'Activists',
  GOVERNMENT_LEGISLATIVE: 'Legislature', ENVIRONMENT: 'Environment', SHOCK: 'Shock',
};
function humanize(type: string): string {
  if (HUMANIZE[type]) return HUMANIZE[type];
  const head = type.split('_')[0] || type;
  return head.charAt(0).toUpperCase() + head.slice(1).toLowerCase();
}

// ---- sim types -------------------------------------------------------------
interface Node {
  key: string; type: string; label: string; color: string;
  x: number; y: number; vx: number; vy: number;
  homeAng: number;           // slot on the home ring (recomputed each frame for agents)
  isSpecial: boolean;        // env / shock nodes anchor differently
  flareUntil: number;        // radius bump when the node acts
  redUntil: number;          // red flash on black swan
  born: number;
}
interface Pulse {
  from: string; to: string; t0: number; dur: number; color: string; done: boolean;
}
interface Edge { w: number; color: string; }       // persistent relationship weight (decays)
interface Ring { x: number; y: number; t0: number; dur: number; color: string; }
interface Mote { x: number; y: number; vx: number; vy: number; color: string; born: number; }
interface Ambient { x: number; y: number; vx: number; vy: number; }

export const RealityCollider: React.FC<RealityColliderProps> = ({ events, status, progress, outcomes, running, paused, lens }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cursor = useRef(0);
  const nodes = useRef<Map<string, Node>>(new Map());
  const order = useRef<string[]>([]);          // agent node keys in creation order (for ring layout)
  const pulses = useRef<Pulse[]>([]);
  const edges = useRef<Map<string, Edge>>(new Map());
  const rings = useRef<Ring[]>([]);            // shockwaves + arrival ripples
  const motes = useRef<Mote[]>([]);
  const ambient = useRef<Ambient[]>([]);
  const tickRef = useRef(0);
  const flashUntil = useRef(0);                // white flash on injection
  const size = useRef({ w: 1200, h: 800 });
  const reduced = useRef(false);
  const pausedRef = useRef(false);
  const accentRef = useRef('#6C63FF');
  accentRef.current = lens?.accent ?? '#6C63FF';
  pausedRef.current = !!paused;

  // Lazily create a node. Agents land on the home ring; env/shock are anchored.
  const ensureNode = (key: string, type: string, now: number): Node => {
    let n = nodes.current.get(key);
    if (n) return n;
    const special = key === 'env' || key === 'shock';
    const { w, h } = size.current;
    const seed = hashString(key + type);
    n = {
      key, type, label: humanize(type),
      color: special ? '#8892B0' : AGENT_PALETTE[hashString(type) % AGENT_PALETTE.length],
      // spawn near center with a small random offset so they drift outward
      x: w * 0.5 + (((seed % 100) / 100) - 0.5) * 120,
      y: h * 0.5 + ((((seed >> 3) % 100) / 100) - 0.5) * 120,
      vx: 0, vy: 0, homeAng: 0, isSpecial: special,
      flareUntil: 0, redUntil: 0, born: now,
    };
    nodes.current.set(key, n);
    if (!special) order.current.push(key);
    return n;
  };

  const edgeKey = (a: string, b: string) => (a < b ? a + '|' + b : b + '|' + a);
  const bumpEdge = (a: string, b: string, color: string) => {
    if (a === b) return;
    const k = edgeKey(a, b);
    const e = edges.current.get(k);
    if (e) { e.w = Math.min(1.6, e.w + 0.5); e.color = color; }
    else edges.current.set(k, { w: 0.6, color });
  };
  const spawnPulse = (from: string, to: string, color: string, now: number) => {
    if (!nodes.current.has(from) || !nodes.current.has(to)) return;
    if (reduced.current && pulses.current.length > 60) return;
    pulses.current.push({ from, to, t0: now, dur: 600 + Math.random() * 300, color, done: false });
    if (pulses.current.length > MAX_PULSES) pulses.current.splice(0, pulses.current.length - MAX_PULSES);
  };

  // ---- ingest new events (diff by events.length) ---------------------------
  useEffect(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    for (let i = cursor.current; i < events.length; i++) {
      const ev = events[i]; if (!ev) continue;
      const raw = ev.raw || {};
      const rt: string = raw.type ?? ev.type ?? '';

      if (rt === 'agents' && Array.isArray(raw.agents)) {
        for (const a of raw.agents) ensureNode(String(a.slot), String(a.type ?? 'AGENT'), now);
        ensureNode('env', 'ENVIRONMENT', now);
        ensureNode('shock', 'SHOCK', now);
      } else if (rt === 'interactions' && Array.isArray(raw.links)) {
        for (const l of raw.links) {
          const srcKey = l.s === 'shock' ? 'shock' : String(l.s);
          const src = nodes.current.get(srcKey);
          const coop = COOP.has(String(l.action ?? '').toUpperCase());
          const color = l.agg ? '#FF3366' : coop ? COOP_COLOR : accentRef.current;
          if (src) src.flareUntil = now + 420;   // the actor flares
          if (l.t === 'all') {
            for (const key of order.current) { spawnPulse('shock', key, color, now); bumpEdge('shock', key, color); }
          } else {
            const dstKey = l.t === 'env' ? 'env' : String(l.t);
            spawnPulse(srcKey, dstKey, color, now);
            bumpEdge(srcKey, dstKey, color);
          }
          if (l.swan) rings.current.push({ x: size.current.w / 2, y: size.current.h / 2, t0: now, dur: 1400, color: '#FF3366' });
        }
      } else if (rt === 'tick') {
        if (typeof raw.tick === 'number') tickRef.current = raw.tick;
        if (raw.black_swan) {
          rings.current.push({ x: size.current.w / 2, y: size.current.h / 2, t0: now, dur: 1600, color: '#FF3366' });
          nodes.current.forEach(n => { n.redUntil = now + 500; });
        }
      } else if (rt === 'run_complete') {
        const oc = String(raw.outcome ?? 'UNKNOWN');
        const c = OUTCOME_COLORS[oc] ?? accentRef.current;
        const { w, h } = size.current;
        motes.current.push({
          x: w / 2 + (Math.random() - 0.5) * 40, y: h / 2 + (Math.random() - 0.5) * 40,
          vx: (30 - w / 2) * 0.0012, vy: (h - 40 - h / 2) * 0.0012, color: c, born: now,
        });
      } else if (rt === 'injected' || ev.type === 'injected') {
        flashUntil.current = now + 260;
      }
    }
    cursor.current = events.length;
  }, [events.length]);

  // ---- canvas + animation loop ---------------------------------------------
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

    // ambient idle points (drift when no agents have arrived yet)
    ambient.current = Array.from({ length: 14 }, () => ({
      x: Math.random() * size.current.w, y: Math.random() * size.current.h,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
    }));

    // interpolate a point along a node->node line (nodes keep moving, so read live)
    const nodePos = (key: string) => nodes.current.get(key);

    const step = () => {
      const { w, h } = size.current;
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      const accent = accentRef.current;
      const cx = w / 2, cy = h / 2;
      const ringR = Math.min(w, h) * 0.30;
      const pausedK = pausedRef.current ? 0.28 : 1;      // dim motion while paused
      const jitterAmp = (reduced.current ? 0.04 : 0.16) * pausedK;

      // background: translucent fill leaves motion trails; opaque if reduced-motion
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = reduced.current ? BG : 'rgba(10,10,15,0.25)';
      ctx.fillRect(0, 0, w, h);

      const nodeList = Array.from(nodes.current.values());
      const agentCount = order.current.length;

      // ---- PHYSICS: repulsion + spring-to-home + jitter + damping ----------
      // assign even home slots on the ring to agent nodes each frame
      order.current.forEach((k, i) => {
        const n = nodes.current.get(k); if (n) n.homeAng = (i / Math.max(1, agentCount)) * Math.PI * 2 - Math.PI / 2;
      });
      for (let i = 0; i < nodeList.length; i++) {
        const a = nodeList[i];
        // mutual repulsion (inverse-square, capped)
        for (let j = i + 1; j < nodeList.length; j++) {
          const b = nodeList[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy; if (d2 < 1) d2 = 1;
          const f = Math.min(0.9, 5200 / d2);
          const d = Math.sqrt(d2); dx /= d; dy /= d;
          a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
        }
        // home target: agents on the ring, env at center, shock above center
        let hx = cx, hy = cy;
        if (a.key === 'shock') { hx = cx; hy = cy - ringR * 1.15; }
        else if (a.key === 'env') { hx = cx; hy = cy; }
        else { hx = cx + Math.cos(a.homeAng) * ringR; hy = cy + Math.sin(a.homeAng) * ringR; }
        a.vx += (hx - a.x) * 0.012; a.vy += (hy - a.y) * 0.012;
        // gentle Brownian jitter so nothing ever freezes
        a.vx += (Math.random() - 0.5) * jitterAmp; a.vy += (Math.random() - 0.5) * jitterAmp;
        // damping + integrate
        a.vx *= 0.9; a.vy *= 0.9; a.x += a.vx * pausedK; a.y += a.vy * pausedK;
        // soft bounds
        const m = 44;
        if (a.x < m) { a.x = m; a.vx *= -0.5; } if (a.x > w - m) { a.x = w - m; a.vx *= -0.5; }
        if (a.y < m) { a.y = m; a.vy *= -0.5; } if (a.y > h - m) { a.y = h - m; a.vy *= -0.5; }
      }

      // ---- relationship edges (decaying web) -------------------------------
      ctx.globalCompositeOperation = 'source-over';
      edges.current.forEach((e, k) => {
        e.w *= 0.992;                                   // decay over time
        if (e.w < 0.03) { edges.current.delete(k); return; }
        const [ka, kb] = k.split('|');
        const a = nodePos(ka), b = nodePos(kb); if (!a || !b) return;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = e.color + Math.round(Math.min(0.5, e.w * 0.4) * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 0.6 + e.w * 0.6; ctx.stroke();
      });

      // ---- pulses travelling along edges (additive glow) -------------------
      ctx.globalCompositeOperation = 'lighter';
      for (const p of pulses.current) {
        const a = nodePos(p.from), b = nodePos(p.to); if (!a || !b) { p.done = true; continue; }
        const t = (now - p.t0) / p.dur;
        if (t >= 1) {
          if (!p.done) { rings.current.push({ x: b.x, y: b.y, t0: now, dur: 420, color: p.color }); p.done = true; }
          continue;
        }
        // slight arc via a perpendicular midpoint bulge
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const nx = -(b.y - a.y), ny = (b.x - a.x);
        const nl = Math.hypot(nx, ny) || 1; const bulge = 22;
        const qx = mx + (nx / nl) * bulge, qy = my + (ny / nl) * bulge;
        const it = 1 - t;
        const px = it * it * a.x + 2 * it * t * qx + t * t * b.x;
        const py = it * it * a.y + 2 * it * t * qy + t * t * b.y;
        const r = 2.6;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
        g.addColorStop(0, p.color); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r * 3, 0, Math.PI * 2); ctx.fill();
      }
      pulses.current = pulses.current.filter(p => !p.done);

      // ---- shockwaves + arrival ripples ------------------------------------
      for (const rg of rings.current) {
        const t = (now - rg.t0) / rg.dur; if (t >= 1) continue;
        const maxR = rg.dur > 1000 ? Math.min(w, h) * 0.55 : 26;
        const rr = t * maxR;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = rg.color + Math.round((1 - t) * 200).toString(16).padStart(2, '0');
        ctx.lineWidth = rg.dur > 1000 ? 2.4 : 1.2; ctx.stroke();
      }
      rings.current = rings.current.filter(rg => (now - rg.t0) / rg.dur < 1);

      // ---- nodes (additive glow) -------------------------------------------
      for (const n of nodeList) {
        const flaring = now < n.flareUntil ? (n.flareUntil - now) / 420 : 0;
        const red = now < n.redUntil;
        const base = n.isSpecial ? 5 : 7;
        const r = base + flaring * 6;
        const col = red ? '#FF3366' : n.color;
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.4);
        g.addColorStop(0, col); g.addColorStop(0.5, col + '88'); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(n.x, n.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
      }

      // ---- outcome motes drifting to the tally -----------------------------
      ctx.globalCompositeOperation = 'lighter';
      motes.current = motes.current.filter(mo => (now - mo.born) < 3000);
      for (const mo of motes.current) {
        mo.x += mo.vx * 16 * pausedK; mo.y += mo.vy * 16 * pausedK;
        const g = ctx.createRadialGradient(mo.x, mo.y, 0, mo.x, mo.y, 6);
        g.addColorStop(0, mo.color); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mo.x, mo.y, 6, 0, Math.PI * 2); ctx.fill();
      }

      // ---- idle ambient drift (only meaningful when no agents yet) ----------
      if (agentCount === 0) {
        for (const a of ambient.current) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > w) a.vx *= -1; if (a.y < 0 || a.y > h) a.vy *= -1;
          const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 4);
          g.addColorStop(0, accent + '99'); g.addColorStop(1, 'transparent');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, 4, 0, Math.PI * 2); ctx.fill();
        }
      }

      // ---- labels (source-over so text stays legible) ----------------------
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      for (const n of nodeList) ctx.fillText(n.label, n.x, n.y + 12);

      // ---- injection flash --------------------------------------------------
      if (now < flashUntil.current) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255,255,255,' + ((flashUntil.current - now) / 260) * 0.35 + ')';
        ctx.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // ---- HUD (React render; reads refs, no per-frame state) -------------------
  const agentCount = order.current.length;
  const term = lens?.particle_term ?? 'actors';

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" style={{ background: BG }}>
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* top-left: lens label + status dot + actor/tick readout */}
      <div className="absolute top-4 left-5 font-mono text-xs pointer-events-none select-none">
        <div className="text-white/90 tracking-wide">{lens ? lens.label : 'Reality Collider'}</div>
        <div className="mt-1 flex items-center gap-2 text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: paused ? '#FFB800' : accentRef.current }} />
          {status}
        </div>
        <div className="text-gray-600 mt-0.5">{agentCount} {term} · tick {tickRef.current}</div>
      </div>

      {/* bottom-left: outcome tally pills, relabeled by the lens vocab */}
      {Object.keys(outcomes).length > 0 && (
        <div className="absolute bottom-4 left-5 flex flex-col gap-1 pointer-events-none">
          {Object.entries(outcomes).map(([o, n]) => (
            <span key={o} className="text-[10px] font-mono flex items-center gap-1.5" style={{ color: OUTCOME_COLORS[o] ?? accentRef.current }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: OUTCOME_COLORS[o] ?? accentRef.current }} />
              {lens?.outcome_vocab?.[o] ?? o} · {n}
            </span>
          ))}
        </div>
      )}

      {/* idle hint */}
      {!running && agentCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-mono text-sm pointer-events-none">
          Awaiting reality collision
        </div>
      )}
    </div>
  );
};

export default RealityCollider;
