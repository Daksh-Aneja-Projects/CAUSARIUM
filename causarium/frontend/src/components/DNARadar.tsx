import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * DNARadar — the signature "Reality DNA" visual for CAUSARIUM.
 *
 * Renders a 10-dimensional behavioral fingerprint (values 0..1) as an animated
 * neon radar / spider chart. Replaces the old flat-bar layout with concentric
 * grid rings, faint axis spokes, a filled accent polygon with glowing vertices,
 * and an optional dashed "compare" polygon for A/B (e.g. counterfactual) contrast.
 */

export interface DNARadarProps {
  dna: Record<string, number>;      // dimension -> 0..1
  accent?: string;                  // default '#6C63FF'
  compare?: Record<string, number> | null; // optional 2nd polygon (e.g. counterfactual)
  size?: number;                    // px, default 320
  title?: string;
}

// Fixed dimension order. Missing keys tolerate -> 0.
const DIMENSIONS = [
  'aggression', 'innovation', 'trust', 'risk', 'chaos',
  'adaptability', 'fragility', 'resilience', 'intelligence', 'entropy',
] as const;

const COMPARE_COLOR = '#00D9FF';
const RINGS = [0.25, 0.5, 0.75, 1.0]; // concentric grid levels

// Clamp a value into 0..1, treating NaN/undefined as 0.
const clamp01 = (v: number | undefined): number =>
  !v || Number.isNaN(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v;

// Detect reduced-motion preference once (SSR-safe).
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const DNARadar: React.FC<DNARadarProps> = ({
  dna,
  accent = '#6C63FF',
  compare = null,
  size = 320,
  title,
}) => {
  // `progress` drives the mount animation: polygons grow from center (0) to full (1).
  const [progress, setProgress] = useState(() => (prefersReducedMotion() ? 1 : 0));
  // Index of the currently hovered vertex, or null.
  const [hover, setHover] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // --- Geometry --------------------------------------------------------------
  // We render into a fixed 100x100 viewBox and let SVG scale to `size`. Extra
  // viewBox padding around the ring leaves room for outside labels without clipping.
  const CENTER = 50;
  const RADIUS = 34;          // ring radius within the viewBox
  const LABEL_R = RADIUS + 9; // label ring sits just outside the grid
  const N = DIMENSIONS.length;

  // Precompute the unit direction (cos/sin) for each axis. Start at 12 o'clock
  // (-90deg) and go clockwise so the layout reads naturally.
  const axes = useMemo(() =>
    DIMENSIONS.map((_, i) => {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      return { cos: Math.cos(angle), sin: Math.sin(angle) };
    }), [N]);

  // Map a per-dimension value set to an "x,y x,y ..." SVG points string,
  // scaled by the current animation progress.
  const toPoints = (source: Record<string, number>): string =>
    DIMENSIONS.map((dim, i) => {
      const r = RADIUS * clamp01(source[dim]) * progress;
      return `${CENTER + axes[i].cos * r},${CENTER + axes[i].sin * r}`;
    }).join(' ');

  const dnaPoints = useMemo(() => toPoints(dna), [dna, progress, axes]);
  const comparePoints = useMemo(
    () => (compare ? toPoints(compare) : ''),
    [compare, progress, axes]
  );

  // --- Mount animation -------------------------------------------------------
  // Ease the polygon outward over ~600ms via requestAnimationFrame. Respect
  // prefers-reduced-motion by skipping straight to the final shape.
  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      return;
    }
    const DURATION = 600;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / DURATION, 1);
      // easeOutCubic for a confident, decelerating grow.
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Vertex coordinates for the DNA polygon (for the glowing dots + hover targets).
  const vertices = useMemo(() =>
    DIMENSIONS.map((dim, i) => {
      const v = clamp01(dna[dim]);
      const r = RADIUS * v * progress;
      return {
        dim,
        value: v,
        x: CENTER + axes[i].cos * r,
        y: CENTER + axes[i].sin * r,
        // Fully-extended anchor is used to position the outside label.
        lx: CENTER + axes[i].cos * LABEL_R,
        ly: CENTER + axes[i].sin * LABEL_R,
        cos: axes[i].cos,
      };
    }), [dna, progress, axes]);

  return (
    <div
      className="flex flex-col items-center select-none"
      style={{ width: size }}
    >
      {title && (
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-gray-400 mb-2">
          {title}
        </div>
      )}

      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={title ? `${title} reality DNA radar` : 'Reality DNA radar'}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          {/* Soft glow for polygon strokes and vertex dots. */}
          <filter id="dna-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Concentric grid rings (faint polygons) */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={axes
              .map((a) => `${CENTER + a.cos * RADIUS * ring},${CENTER + a.sin * RADIUS * ring}`)
              .join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.3}
          />
        ))}

        {/* Axis spokes from center to each vertex */}
        {axes.map((a, i) => (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={CENTER + a.cos * RADIUS}
            y2={CENTER + a.sin * RADIUS}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.3}
          />
        ))}

        {/* Compare polygon (dashed cyan) drawn beneath the primary polygon */}
        {compare && (
          <polygon
            points={comparePoints}
            fill={COMPARE_COLOR}
            fillOpacity={0.06}
            stroke={COMPARE_COLOR}
            strokeWidth={0.6}
            strokeDasharray="1.6 1.2"
            strokeLinejoin="round"
            filter="url(#dna-glow)"
          />
        )}

        {/* Primary DNA polygon */}
        <polygon
          points={dnaPoints}
          fill={accent}
          fillOpacity={0.18}
          stroke={accent}
          strokeWidth={0.8}
          strokeLinejoin="round"
          filter="url(#dna-glow)"
        />

        {/* Glowing vertices + hover hit-areas + labels */}
        {vertices.map((v, i) => {
          const active = hover === i;
          // Nudge label anchor left/right so text stays off the chart edges.
          const anchor = v.cos > 0.25 ? 'start' : v.cos < -0.25 ? 'end' : 'middle';
          return (
            <g key={v.dim}>
              {/* Enlarged transparent hit target for reliable hover */}
              <circle
                cx={v.x}
                cy={v.y}
                r={4}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {/* Visible glowing dot */}
              <circle
                cx={v.x}
                cy={v.y}
                r={active ? 1.9 : 1.2}
                fill={accent}
                filter="url(#dna-glow)"
                style={{ transition: 'r 120ms ease' }}
              />

              {/* Axis label (uppercase, tiny, mono) */}
              <text
                x={v.lx}
                y={v.ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={2.6}
                letterSpacing={0.15}
                className="font-mono"
                fill={active ? '#ffffff' : 'rgba(255,255,255,0.55)'}
                style={{ textTransform: 'uppercase', transition: 'fill 120ms ease' }}
              >
                {v.dim.slice(0, 6)}
              </text>

              {/* Numeric value: always faint below label, brightened on hover */}
              <text
                x={v.lx}
                y={v.ly + 3.2}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={active ? 3 : 2.3}
                className="font-mono"
                fill={active ? COMPARE_COLOR : 'rgba(255,255,255,0.3)'}
                style={{ transition: 'all 120ms ease' }}
              >
                {v.value.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend — only shown when a compare polygon is present */}
      {compare && (
        <div className="flex items-center gap-5 mt-3 font-mono text-[10px] uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="inline-block w-3 h-0.5 rounded" style={{ background: accent }} />
            Primary
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span
              className="inline-block w-3 h-0.5 rounded"
              style={{ background: `repeating-linear-gradient(90deg, ${COMPARE_COLOR} 0 3px, transparent 3px 5px)` }}
            />
            Counterfactual
          </span>
        </div>
      )}
    </div>
  );
};

export default DNARadar;
