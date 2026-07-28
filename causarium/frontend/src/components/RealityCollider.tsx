import React, { useEffect, useRef } from 'react';

/**
 * RealityCollider
 * -----------------------------------------------------------------------------
 * The CAUSARIUM hero visualization. A live parallel-futures simulation is
 * rendered as flowing particles that stream from per-agent-type emitters on the
 * canvas rim, collapse into outcome nodes at the core, and accrete into
 * "gravity wells" — one glowing attractor disc per possible outcome, growing in
 * mass as timelines resolve into it.
 *
 * All animation state lives in refs (never React state) so the rAF loop never
 * triggers a re-render. New WS events are diffed by array length in a useEffect
 * and pushed into a mutable pending-event queue consumed by the loop.
 * -----------------------------------------------------------------------------
 */

// ---- Prop types (exact contract) -------------------------------------------
interface StreamEvent { type: string; message?: string; timestamp: string; raw: any }
interface Lens {
  id: string;
  label: string;
  accent: string;
  icon: string;
  particle_term: string;
  outcome_vocab: Record<string, string>;
}
export interface RealityColliderProps {
  events: StreamEvent[];            // append-only live feed; diff new items by array length
  status: string;                   // 'RUNNING' | 'DISCOVERY' | 'COMPLETE' | ...
  progress: number;                 // 0-100
  outcomes: Record<string, number>; // outcome -> count, accumulates during the run
  running: boolean;
  paused?: boolean;
  lens?: Lens | null;
}

// ---- Constants --------------------------------------------------------------
const BG = '#0A0A0F';
const OUTCOME_COLORS: Record<string, string> = {
  SYSTEMIC_COLLAPSE: '#FF3366',
  CONFLICT_ESCALATION: '#FF7A45',
  MONOPOLY_CAPTURE: '#FFB800',
  DISRUPTIVE_INNOVATION: '#B36CFF',
  STABLE_COOPERATION: '#00E5A0',
  FRAGMENTED_STALEMATE: '#00D9FF',
};
const AGENT_PALETTE = ['#6C63FF', '#00D9FF', '#FF3366', '#FFB800', '#00E5A0', '#B36CFF', '#FF7A45'];
const MAX_PARTICLES = 1400;
const DEFAULT_ACCENT = '#6C63FF';

// Deterministic string hash -> non-negative int.
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function agentColor(agentType: string): string {
  return AGENT_PALETTE[hashString(agentType || 'agent') % AGENT_PALETTE.length];
}
function outcomeColor(outcome: string): string {
  return OUTCOME_COLORS[outcome] ?? AGENT_PALETTE[hashString(outcome) % AGENT_PALETTE.length];
}

// ---- Mutable simulation entities -------------------------------------------
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  target: 'core' | 'well';
  wellKey?: string;   // when absorbed into a specific well
  absorbed: boolean;
}
interface Shockwave { x: number; y: number; r: number; maxR: number; color: string; alpha: number }
interface Well {
  key: string;        // outcome key
  angle: number;      // fixed slot angle on the ring
  count: number;
  color: string;
  wobble: number;     // phase for orbital wobble
}

export const RealityCollider: React.FC<RealityColliderProps> = (props) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  // Live, per-frame mutable state (kept out of React to avoid re-renders).
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const wellsRef = useRef<Map<string, Well>>(new Map());
  const sizeRef = useRef({ w: 0, h: 0, cx: 0, cy: 0, dpr: 1 });
  const corePulseRef = useRef(0);          // decays each frame; bumped on ticks
  const shakeRef = useRef(0);              // screen-shake magnitude, decays
  const flashRef = useRef(0);              // injection flash, decays
  const timeRef = useRef(0);
  const settleRef = useRef(false);         // 'complete' -> draw filaments, calm down

  // Snapshot of props the loop reads (updated each render via ref).
  const propsRef = useRef(props);
  propsRef.current = props;

  // Event cursor: how many events we've already ingested.
  const cursorRef = useRef(0);

  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ).current;

  // --- Helpers that mutate entity pools --------------------------------------
  const pushParticle = (p: Particle) => {
    const pool = particlesRef.current;
    if (pool.length >= MAX_PARTICLES) pool.shift(); // recycle oldest
    pool.push(p);
  };

  // Assign each outcome a stable well slot on the ring, in first-seen order.
  const ensureWell = (key: string): Well => {
    const wells = wellsRef.current;
    let w = wells.get(key);
    if (!w) {
      const slot = wells.size;
      // Golden-angle-ish distribution so early wells spread nicely.
      const angle = -Math.PI / 2 + slot * 2.399963;
      w = { key, angle, count: 0, color: outcomeColor(key), wobble: Math.random() * Math.PI * 2 };
      wells.set(key, w);
    }
    return w;
  };

  // --- Event ingestion: react to NEW events only -----------------------------
  useEffect(() => {
    const { events } = props;
    const { cx, cy, w: W } = sizeRef.current;
    const rim = Math.min(W || 800, sizeRef.current.h || 600) * 0.52;
    const burst = reducedMotion ? 2 : 8;

    for (let i = cursorRef.current; i < events.length; i++) {
      const ev = events[i];
      const raw = ev?.raw ?? {};
      switch (ev?.type) {
        case 'agent_decision': {
          const at = String(raw.agent_type ?? raw.persona ?? 'agent');
          const color = agentColor(at);
          // Stable emitter angle from a hash of the agent type.
          const ang = (hashString(at) % 360) * (Math.PI / 180);
          const ex = cx + Math.cos(ang) * rim;
          const ey = cy + Math.sin(ang) * rim;
          const n = burst + (Math.floor(Math.random() * 3));
          for (let k = 0; k < n; k++) {
            const jitter = (Math.random() - 0.5) * 0.35;
            const a = ang + Math.PI + jitter; // aim toward center
            const speed = 0.6 + Math.random() * 1.1;
            pushParticle({
              x: ex + (Math.random() - 0.5) * 24,
              y: ey + (Math.random() - 0.5) * 24,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              life: 0,
              maxLife: 220 + Math.random() * 160,
              color,
              size: 1.1 + Math.random() * 1.6,
              target: 'core',
              absorbed: false,
            });
          }
          break;
        }
        case 'tick': {
          corePulseRef.current = Math.min(1, corePulseRef.current + 0.5);
          if (raw.black_swan) {
            shockwavesRef.current.push({
              x: cx, y: cy, r: 8, maxR: rim * 1.4, color: '#FF2FD0', alpha: 1,
            });
            if (!reducedMotion) shakeRef.current = Math.min(14, shakeRef.current + 10);
          }
          break;
        }
        case 'run_complete': {
          const outcome = String(raw.outcome ?? 'UNKNOWN');
          const well = ensureWell(outcome);
          well.count += 1;
          // Spawn a bright outcome node at core that will be drawn toward the well.
          const nodeN = reducedMotion ? 3 : 10;
          for (let k = 0; k < nodeN; k++) {
            const a = Math.random() * Math.PI * 2;
            const speed = 0.4 + Math.random() * 0.6;
            pushParticle({
              x: cx + Math.cos(a) * 6,
              y: cy + Math.sin(a) * 6,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              life: 0,
              maxLife: 400,
              color: well.color,
              size: 1.8 + Math.random() * 2.2,
              target: 'well',
              wellKey: outcome,
              absorbed: false,
            });
          }
          break;
        }
        case 'complete': {
          settleRef.current = true;
          break;
        }
        case 'injected': {
          flashRef.current = 1;
          break;
        }
        case 'paused':
        case 'resumed': {
          flashRef.current = 0.4;
          break;
        }
        default:
          break;
      }
    }
    cursorRef.current = events.length;
  }, [props.events.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Canvas sizing (DPR + ResizeObserver) ----------------------------------
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h, cx: w / 2, cy: h / 2, dpr };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // --- Main render loop ------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      timeRef.current += 1;
      const t = timeRef.current;
      const { w, h, cx, cy, dpr } = sizeRef.current;
      const p = propsRef.current;
      const accent = p.lens?.accent || DEFAULT_ACCENT;
      const idle = !p.running && p.events.length === 0;
      const ringR = Math.min(w, h) * 0.34;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Screen-shake-lite offset.
      let shake = shakeRef.current;
      if (shake > 0.1) {
        const ox = (Math.random() - 0.5) * shake;
        const oy = (Math.random() - 0.5) * shake;
        ctx.translate(ox, oy);
        shakeRef.current = shake * 0.86;
      } else {
        shakeRef.current = 0;
      }

      // Trailing fade background (motion blur feel). Full clear when reduced.
      ctx.globalCompositeOperation = 'source-over';
      if (reducedMotion) {
        ctx.fillStyle = BG;
        ctx.fillRect(-20, -20, w + 40, h + 40);
      } else {
        ctx.fillStyle = 'rgba(10,10,15,0.28)';
        ctx.fillRect(-20, -20, w + 40, h + 40);
      }

      // Ambient idle particles: a slow drifting field.
      if (idle && !reducedMotion && t % 5 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = ringR * (0.7 + Math.random() * 0.6);
        pushParticle({
          x: cx + Math.cos(a) * r,
          y: cy + Math.sin(a) * r,
          vx: Math.cos(a + Math.PI / 2) * 0.15,
          vy: Math.sin(a + Math.PI / 2) * 0.15,
          life: 0,
          maxLife: 300,
          color: accent,
          size: 0.8 + Math.random(),
          target: 'core',
          absorbed: false,
        });
      }

      // --- Gravity wells (draw first so particles glow over them) -----------
      const wells = wellsRef.current;
      ctx.globalCompositeOperation = 'lighter';
      wells.forEach((wl) => {
        wl.wobble += 0.012;
        const wob = reducedMotion ? 0 : Math.sin(wl.wobble) * 6;
        const wx = cx + Math.cos(wl.angle) * (ringR + wob);
        const wy = cy + Math.sin(wl.angle) * (ringR + wob);
        const mass = 6 + Math.min(46, wl.count * 3);
        // Accretion halo.
        const halo = ctx.createRadialGradient(wx, wy, 0, wx, wy, mass * 2.6);
        halo.addColorStop(0, wl.color + 'AA');
        halo.addColorStop(0.4, wl.color + '33');
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(wx, wy, mass * 2.6, 0, Math.PI * 2);
        ctx.fill();
        // Core disc.
        ctx.fillStyle = wl.color;
        ctx.beginPath();
        ctx.arc(wx, wy, mass * 0.4, 0, Math.PI * 2);
        ctx.fill();
        (wl as any)._px = wx;
        (wl as any)._py = wy;
      });

      // Connective filaments between wells when settled.
      if (settleRef.current && wells.size > 1) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 0.6;
        const arr = Array.from(wells.values());
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            const a = arr[i] as any, b = arr[j] as any;
            if (a._px == null || b._px == null) continue;
            ctx.strokeStyle = 'rgba(120,140,220,0.06)';
            ctx.beginPath();
            ctx.moveTo(a._px, a._py);
            ctx.lineTo(b._px, b._py);
            ctx.stroke();
          }
        }
      }

      // --- Central core -----------------------------------------------------
      corePulseRef.current *= 0.94;
      const pulse = corePulseRef.current;
      const coreR = 16 + pulse * 22 + Math.sin(t * 0.05) * 2;
      ctx.globalCompositeOperation = 'lighter';
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3);
      coreGrad.addColorStop(0, accent + 'EE');
      coreGrad.addColorStop(0.3, accent + '55');
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, 3 + pulse * 4, 0, Math.PI * 2);
      ctx.fill();

      // Progress arc ring around the core.
      const prog = Math.max(0, Math.min(100, p.progress)) / 100;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(cx, cy, coreR + 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, coreR + 14, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      ctx.stroke();

      // --- Shockwaves -------------------------------------------------------
      ctx.globalCompositeOperation = 'lighter';
      shockwavesRef.current = shockwavesRef.current.filter((s) => s.alpha > 0.02);
      for (const s of shockwavesRef.current) {
        s.r += 6;
        s.alpha *= 0.94;
        ctx.strokeStyle = `rgba(255,47,208,${s.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- Particles --------------------------------------------------------
      ctx.globalCompositeOperation = 'lighter';
      const pool = particlesRef.current;
      const speedScale = settleRef.current ? 0.5 : 1;
      const paused = !!p.paused;
      for (let i = pool.length - 1; i >= 0; i--) {
        const pt = pool[i];
        pt.life += 1;

        // Attraction target.
        let tx = cx, ty = cy;
        if (pt.target === 'well' && pt.wellKey) {
          const wl = wells.get(pt.wellKey) as any;
          if (wl && wl._px != null) { tx = wl._px; ty = wl._py; }
        }
        const dx = tx - pt.x;
        const dy = ty - pt.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (!paused) {
          // Gentle gravitational pull toward target.
          const pull = (pt.target === 'well' ? 0.06 : 0.035) * speedScale;
          pt.vx += (dx / dist) * pull;
          pt.vy += (dy / dist) * pull;
          // Mild damping keeps things flowing, not exploding.
          pt.vx *= 0.985;
          pt.vy *= 0.985;
          pt.x += pt.vx * speedScale;
          pt.y += pt.vy * speedScale;
        }

        // Absorption when close to target.
        const absorbDist = pt.target === 'well' ? 16 : 8;
        if (dist < absorbDist) {
          if (pt.target === 'core') {
            corePulseRef.current = Math.min(1, corePulseRef.current + 0.02);
          }
          pool.splice(i, 1);
          continue;
        }
        if (pt.life > pt.maxLife) { pool.splice(i, 1); continue; }

        const lifeRatio = 1 - pt.life / pt.maxLife;
        const alpha = Math.max(0, Math.min(1, lifeRatio)) * 0.9;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Injection / pause flash overlay.
      if (flashRef.current > 0.01) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(180,108,255,${flashRef.current * 0.12})`;
        ctx.fillRect(0, 0, w, h);
        flashRef.current *= 0.9;
      }

      // Reset for any downstream text (drawn by HUD in DOM, but keep clean).
      ctx.globalCompositeOperation = 'source-over';

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reducedMotion]);

  // --- HUD (DOM overlay) -----------------------------------------------------
  const { lens, status, running, outcomes } = props;
  const particleTerm = lens?.particle_term ?? 'particles';
  const outcomeEntries = Object.entries(outcomes).sort((a, b) => b[1] - a[1]);
  const idle = !running && props.events.length === 0;

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden" style={{ background: BG }}>
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* Top-left identity + status */}
      <div className="absolute top-4 left-4 font-mono text-xs select-none pointer-events-none">
        <div className="flex items-center gap-2 text-sm text-white/90">
          <span>{lens?.icon ?? '◎'}</span>
          <span className="tracking-wide">{lens?.label ?? 'Reality Collider'}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-widest">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: running ? (lens?.accent ?? DEFAULT_ACCENT) : '#555',
              boxShadow: running ? `0 0 8px ${lens?.accent ?? DEFAULT_ACCENT}` : 'none',
            }}
          />
          <span className="text-white/60">{status || 'IDLE'}</span>
          {props.paused && <span className="text-amber-400/80">PAUSED</span>}
        </div>
        <div className="mt-1 text-[10px] text-white/40">
          {particlesRefCount(particlesRef)} {particleTerm}
        </div>
      </div>

      {/* Bottom-left outcome tally pills */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5 max-w-[70%] pointer-events-none">
        {outcomeEntries.map(([key, count]) => {
          const color = outcomeColor(key);
          const label = lens?.outcome_vocab?.[key] ?? key;
          return (
            <span
              key={key}
              className="font-mono text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: color + '1A', color, border: `1px solid ${color}44` }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              {label}
              <span className="text-white/70">{count}</span>
            </span>
          );
        })}
      </div>

      {/* Idle hint */}
      {idle && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="mt-40 font-mono text-xs uppercase tracking-[0.3em] text-white/25 animate-pulse">
            Awaiting reality collision
          </div>
        </div>
      )}
    </div>
  );
};

// Small helper so the HUD can display the live particle count without a
// per-frame React re-render (reads the ref lazily at render time).
function particlesRefCount(ref: React.MutableRefObject<Particle[]>): number {
  return ref.current.length;
}

export default RealityCollider;
