import React, { useEffect, useRef } from 'react';

/**
 * Reality Collider - a growing timeline network.
 *
 * Each simulation run is drawn as a thin strand of connected nodes that advances
 * left to right as ticks arrive ("creating the future"). When a run completes it
 * settles into a horizontal band grouped with other runs that reached the same
 * outcome, so the finished picture is a fan of distinct timelines branching from
 * a single present. Thin lines, small nodes, restrained glow.
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

const OUTCOME_COLORS: Record<string, string> = {
  SYSTEMIC_COLLAPSE: '#FF3366', CONFLICT_ESCALATION: '#FF7A45', MONOPOLY_CAPTURE: '#FFB800',
  DISRUPTIVE_INNOVATION: '#B36CFF', STABLE_COOPERATION: '#00E5A0', FRAGMENTED_STALEMATE: '#00D9FF',
};

interface Node { x: number; dy: number; born: number; swan: boolean; }
interface Strand {
  run: number; pts: Node[]; outcome: string | null; color: string;
  baseY: number; targetY: number; active: boolean;
}

export const RealityCollider: React.FC<RealityColliderProps> = ({ events, status, progress, outcomes, running, paused, lens }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursor = useRef(0);
  const strands = useRef<Map<number, Strand>>(new Map());
  const laneOrder = useRef<string[]>([]);
  const laneCounts = useRef<Map<string, number>>(new Map());
  const size = useRef({ w: 1200, h: 800 });
  const reduced = useRef(false);
  const accentRef = useRef('#6C63FF');
  accentRef.current = lens?.accent ?? '#6C63FF';

  const originX = () => size.current.w * 0.07;
  const originY = () => size.current.h * 0.5;
  const dxStep = () => (size.current.w * 0.84) / 30;

  const laneY = (outcome: string, idxInLane: number): number => {
    const { h } = size.current;
    const lanes = Math.max(1, laneOrder.current.length);
    const li = Math.max(0, laneOrder.current.indexOf(outcome));
    const bandTop = h * 0.14, bandH = h * 0.72;
    const center = bandTop + ((li + 0.5) / lanes) * bandH;
    return center + ((idxInLane % 6) - 2.5) * 10;
  };

  // Ingest new events.
  useEffect(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    for (let i = cursor.current; i < events.length; i++) {
      const e = events[i]?.raw; if (!e) continue;
      const run = typeof e.run === 'number' ? e.run : -1;
      if (e.type === 'tick' && run >= 0) {
        let s = strands.current.get(run);
        if (!s) {
          s = { run, pts: [], outcome: null, color: accentRef.current, baseY: originY(), targetY: originY(), active: true };
          strands.current.set(run, s);
        }
        s.active = true;
        const tickN = typeof e.tick === 'number' ? e.tick : s.pts.length;
        const x = originX() + Math.min(30, tickN) * dxStep();
        const drift = Math.sin(tickN * 0.9 + run * 1.3) * (size.current.h * 0.03);
        s.pts.push({ x, dy: drift, born: now, swan: !!e.black_swan });
      } else if (e.type === 'run_complete' && run >= 0) {
        const s = strands.current.get(run);
        if (s) {
          const oc = String(e.outcome ?? 'UNKNOWN');
          s.outcome = oc; s.active = false;
          s.color = OUTCOME_COLORS[oc] ?? accentRef.current;
          if (!laneOrder.current.includes(oc)) laneOrder.current.push(oc);
          const idx = laneCounts.current.get(oc) ?? 0;
          laneCounts.current.set(oc, idx + 1);
          s.targetY = laneY(oc, idx);
        }
      }
    }
    cursor.current = events.length;
  }, [events.length]);

  // Canvas + animation.
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
      const accent = accentRef.current;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = reduced.current ? '#0A0A0F' : 'rgba(10,10,15,0.30)';
      ctx.fillRect(0, 0, w, h);

      const ox = originX(), oy = originY();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 1 + Math.sin(now / 600) * 0.15;
      const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, 24 * pulse);
      og.addColorStop(0, accent + 'cc'); og.addColorStop(1, 'transparent');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ox, oy, 24 * pulse, 0, Math.PI * 2); ctx.fill();

      strands.current.forEach(s => {
        s.baseY += (s.targetY - s.baseY) * 0.06;
        if (s.pts.length === 0) return;
        const col = s.active ? accent : s.color;

        ctx.globalCompositeOperation = s.active ? 'lighter' : 'source-over';
        ctx.beginPath(); ctx.moveTo(ox, oy);
        for (let i = 0; i < s.pts.length; i++) {
          const p = s.pts[i];
          const grow = reduced.current ? 1 : Math.min(1, (now - p.born) / 320);
          ctx.lineTo(p.x, s.baseY + p.dy * grow);
        }
        ctx.strokeStyle = col + (s.active ? 'ee' : '66');
        ctx.lineWidth = s.active ? 1.4 : 1;
        ctx.stroke();

        for (let i = 0; i < s.pts.length; i++) {
          const p = s.pts[i];
          const grow = reduced.current ? 1 : Math.min(1, (now - p.born) / 320);
          const y = s.baseY + p.dy * grow;
          const r = (p.swan ? 3.2 : 1.8) * grow;
          ctx.beginPath(); ctx.arc(p.x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = p.swan ? '#FF3366' : col; ctx.fill();
          if (p.swan && !reduced.current) {
            ctx.beginPath(); ctx.arc(p.x, y, 8 * grow, 0, Math.PI * 2);
            ctx.strokeStyle = '#FF336655'; ctx.lineWidth = 1; ctx.stroke();
          }
        }

        const last = s.pts[s.pts.length - 1];
        const ly = s.baseY + last.dy;
        if (s.active) {
          ctx.globalCompositeOperation = 'lighter';
          const tg = ctx.createRadialGradient(last.x, ly, 0, last.x, ly, 10);
          tg.addColorStop(0, accent); tg.addColorStop(1, 'transparent');
          ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(last.x, ly, 10, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.beginPath(); ctx.arc(last.x, ly, 3.4, 0, Math.PI * 2);
          ctx.fillStyle = s.color; ctx.fill();
          ctx.beginPath(); ctx.arc(last.x, ly, 6, 0, Math.PI * 2);
          ctx.strokeStyle = s.color + '55'; ctx.lineWidth = 1; ctx.stroke();
        }
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const term = lens?.particle_term ?? 'events';
  const nodeCount = Array.from(strands.current.values()).reduce((a, s) => a + s.pts.length, 0);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      <div className="absolute top-4 left-5 font-mono text-xs pointer-events-none select-none">
        <div className="text-white/90 tracking-wide">{lens ? lens.label : 'Reality Collider'}</div>
        <div className="mt-1 flex items-center gap-2 text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: paused ? '#FFB800' : accentRef.current }} />
          {status}
        </div>
        <div className="text-gray-600 mt-0.5">{nodeCount} {term}</div>
      </div>

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

      {!running && nodeCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-mono text-sm">
          Awaiting reality collision
        </div>
      )}
    </div>
  );
};

export default RealityCollider;
