import React, { useEffect, useRef } from 'react';

/**
 * A free-flowing ambient particle network. Points drift freely inside the frame
 * (only the boundaries are fixed) and connect with thin lines to nearby points,
 * a living "futures connecting" field. Used behind empty/loading states so the
 * app never feels static. Purely decorative, self-contained, reduced-motion safe.
 */
export interface AmbientFieldProps {
  accent?: string;
  density?: number;        // points per ~100k px^2
  energetic?: boolean;     // faster + more connections (e.g. while reasoning)
  className?: string;
}

interface P { x: number; y: number; vx: number; vy: number; }

export const AmbientField: React.FC<AmbientFieldProps> = ({ accent = '#6C63FF', density = 0.9, energetic = false, className }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pts = useRef<P[]>([]);
  const size = useRef({ w: 800, h: 500 });
  const accentRef = useRef(accent); accentRef.current = accent;
  const energyRef = useRef(energetic); energyRef.current = energetic;

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const canvas = canvasRef.current!, ctx = canvas.getContext('2d')!;
    let raf = 0;

    const seed = () => {
      const { w, h } = size.current;
      const n = Math.max(24, Math.min(90, Math.round((w * h) / 100000 * density * 8)));
      pts.current = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      }));
    };
    const fit = () => {
      const r = wrapRef.current!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: r.width, h: r.height };
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (pts.current.length === 0) seed();
    };
    fit(); seed();
    const ro = new ResizeObserver(fit); ro.observe(wrapRef.current!);

    const hex = accentRef.current;
    const draw = () => {
      const { w, h } = size.current;
      const boost = energyRef.current ? 1.9 : 1;
      const link = energyRef.current ? 150 : 120;
      ctx.clearRect(0, 0, w, h);

      const arr = pts.current;
      for (const p of arr) {
        if (!reduced) {
          p.vx += (Math.random() - 0.5) * 0.06 * boost;
          p.vy += (Math.random() - 0.5) * 0.06 * boost;
          p.vx *= 0.98; p.vy *= 0.98;
          p.x += p.vx * boost; p.y += p.vy * boost;
        }
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        if (p.x > w) { p.x = w; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        if (p.y > h) { p.y = h; p.vy = -Math.abs(p.vy); }
      }
      // connections
      ctx.strokeStyle = accentRef.current;
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const dx = arr[i].x - arr[j].x, dy = arr[i].y - arr[j].y;
          const d = Math.hypot(dx, dy);
          if (d < link) {
            ctx.globalAlpha = (1 - d / link) * (energyRef.current ? 0.35 : 0.18);
            ctx.beginPath(); ctx.moveTo(arr[i].x, arr[i].y); ctx.lineTo(arr[j].x, arr[j].y); ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
      // points
      ctx.globalAlpha = 1;
      ctx.fillStyle = hex;
      for (const p of arr) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill(); }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div ref={wrapRef} className={`absolute inset-0 ${className ?? ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 block" />
    </div>
  );
};

export default AmbientField;
