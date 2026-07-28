// Live.tsx
// A small library of LIVE, animated primitives for the CAUSARIUM dashboard.
// Futuristic dark-neon aesthetic. Every primitive animates smoothly, respects
// prefers-reduced-motion, and is theme-agnostic via a color prop.
// No external dependencies. Animation state lives in refs to avoid per-frame
// React re-render storms; rAF loops are cleaned up on unmount.

import React, { useEffect, useRef, useState } from "react";

// -------------------------------------------------------------------------
// Shared helpers
// -------------------------------------------------------------------------

const DEFAULT_COLOR = "#6C63FF";

// easeOutCubic: fast start, gentle settle. Input/output in 0..1.
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

// Detect reduced-motion preference once (SSR-safe).
const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

// Read a live reduced-motion value that also reacts to runtime changes.
const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState<boolean>(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
};

// -------------------------------------------------------------------------
// 1) AnimatedNumber
// Counts up/down to `value` with easeOutCubic over ~700ms via rAF.
// Re-animates from the previous value whenever `value` changes.
// -------------------------------------------------------------------------

export interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  suffix = "",
  className,
}) => {
  const reduced = useReducedMotion();
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  // The value currently displayed (mutated per frame, kept out of React state).
  const currentRef = useRef<number>(value);

  useEffect(() => {
    const from = currentRef.current;
    const to = value;
    const node = spanRef.current;
    const render = (v: number) => {
      currentRef.current = v;
      if (node) node.textContent = v.toFixed(decimals) + suffix;
    };

    // Reduced-motion: snap straight to the final value.
    if (reduced || from === to) {
      render(to);
      return;
    }

    const duration = 700;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      render(from + (to - from) * easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, decimals, suffix, reduced]);

  return (
    <span ref={spanRef} className={className}>
      {currentRef.current.toFixed(decimals) + suffix}
    </span>
  );
};

// -------------------------------------------------------------------------
// 2) LiveMeter
// Horizontal bar; fill width animates to `value` (0..1) with a soft glow and
// a subtle moving shimmer while the value is greater than 0.
// -------------------------------------------------------------------------

export interface LiveMeterProps {
  value: number;
  color?: string;
  height?: number;
  className?: string;
}

export const LiveMeter: React.FC<LiveMeterProps> = ({
  value,
  color = DEFAULT_COLOR,
  height = 8,
  className,
}) => {
  const clamped = Math.max(0, Math.min(1, value));
  const pct = clamped * 100;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: height,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Fill: CSS width transition handles the smooth animate-to behavior. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: pct + "%",
          borderRadius: height,
          background: color,
          boxShadow: "0 0 " + height * 1.5 + "px " + color,
          transition: "width 700ms cubic-bezier(0.22,1,0.36,1)",
          overflow: "hidden",
        }}
      >
        {/* Shimmer: a translucent sweeping band, only while value > 0. */}
        {clamped > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
              animation: "causarium-shimmer 1.8s linear infinite",
            }}
          />
        )}
      </div>
      {/* Keyframes are scoped by unique names to avoid global collisions. */}
      <style>{
        "@keyframes causarium-shimmer{" +
        "0%{transform:translateX(-100%)}" +
        "100%{transform:translateX(100%)}}" +
        "@media (prefers-reduced-motion: reduce){" +
        "[data-causarium-shimmer]{animation:none!important}}"
      }</style>
    </div>
  );
};

// -------------------------------------------------------------------------
// 3) Sparkline
// SVG line over a numeric series; the newest point animates in. Faint area
// fill under the line and a glowing dot at the last point.
// -------------------------------------------------------------------------

export interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = DEFAULT_COLOR,
  width = 120,
  height = 32,
}) => {
  const reduced = useReducedMotion();
  const pad = 2;
  const n = data.length;

  // Map the series into SVG coordinates.
  const min = n ? Math.min(...data) : 0;
  const max = n ? Math.max(...data) : 1;
  const span = max - min || 1;
  const points = data.map((d, i) => {
    const x = n <= 1 ? pad : pad + (i / (n - 1)) * (width - pad * 2);
    const y = height - pad - ((d - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = points.map((p, i) => (i === 0 ? "M" : "L") + p[0] + " " + p[1]).join(" ");
  const areaPath = points.length
    ? linePath + " L" + points[points.length - 1][0] + " " + (height - pad) +
      " L" + points[0][0] + " " + (height - pad) + " Z"
    : "";

  const last = points[points.length - 1];
  const gid = useRef("spark-" + Math.random().toString(36).slice(2, 8)).current;

  // Animate the glowing dot's radius when the newest point arrives.
  const dotRef = useRef<SVGCircleElement | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const node = dotRef.current;
    if (!node) return;
    if (reduced) {
      node.setAttribute("r", "2.5");
      return;
    }
    let start = 0;
    const duration = 450;
    const step = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      // Pop from 0 to 2.5 with an eased overshoot-free curve.
      node.setAttribute("r", (easeOutCubic(t) * 2.5).toFixed(2));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [data, reduced]);

  return (
    <svg width={width} height={height} viewBox={"0 0 " + width + " " + height} role="img">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={"url(#" + gid + ")"} />}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {last && (
        <circle
          ref={dotRef}
          cx={last[0]}
          cy={last[1]}
          r={reduced ? 2.5 : 0}
          fill={color}
          style={{ filter: "drop-shadow(0 0 3px " + color + ")" }}
        />
      )}
    </svg>
  );
};

// -------------------------------------------------------------------------
// 4) Typewriter
// Reveals `text` char-by-char (~18ms/char, capped so long text finishes
// under 2.5s). Restarts when `text` changes. Blinking caret while typing.
// -------------------------------------------------------------------------

export interface TypewriterProps {
  text: string;
  className?: string;
  onDone?: () => void;
}

export const Typewriter: React.FC<TypewriterProps> = ({ text, className, onDone }) => {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<string>("");
  const [typing, setTyping] = useState<boolean>(true);
  const rafRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // Reduced-motion: reveal everything at once.
    if (reduced || text.length === 0) {
      setShown(text);
      setTyping(false);
      onDoneRef.current?.();
      return;
    }

    setShown("");
    setTyping(true);
    // Per-char delay is 18ms, but shrink it so total stays under 2.5s.
    const perChar = Math.min(18, 2500 / text.length);
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const count = Math.min(text.length, Math.floor((ts - start) / perChar));
      setShown(text.slice(0, count));
      if (count < text.length) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setTyping(false);
        onDoneRef.current?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [text, reduced]);

  return (
    <span className={className}>
      {shown}
      {typing && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: "0.6ch",
            marginLeft: "1px",
            background: "currentColor",
            animation: "causarium-caret 1s steps(1) infinite",
          }}
        >
          {" "}
        </span>
      )}
      <style>{
        "@keyframes causarium-caret{0%,50%{opacity:1}50.01%,100%{opacity:0}}"
      }</style>
    </span>
  );
};

// -------------------------------------------------------------------------
// 5) Ring
// SVG progress ring; stroke animates to `value` (0..1). Center shows the
// percentage with a count-up feel (reuses AnimatedNumber).
// -------------------------------------------------------------------------

export interface RingProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}

export const Ring: React.FC<RingProps> = ({
  value,
  size = 96,
  stroke = 8,
  color = DEFAULT_COLOR,
  label,
}) => {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped);
  const reduced = useReducedMotion();

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {/* Progress: rotated so 0 begins at the top; stroke-dashoffset animates. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={"rotate(-90 " + size / 2 + " " + size / 2 + ")"}
          style={{
            transition: reduced
              ? "none"
              : "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)",
            filter: "drop-shadow(0 0 4px " + color + ")",
          }}
        />
      </svg>
      {/* Center readout with count-up percentage. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1.1,
        }}
      >
        <AnimatedNumber
          value={clamped * 100}
          decimals={0}
          suffix="%"
          className="font-semibold"
        />
        {label && (
          <span style={{ fontSize: "0.65em", opacity: 0.7, marginTop: 2 }}>{label}</span>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// 6) Pulse
// A tiny live "heartbeat" dot that gently pulses (scale + opacity) forever.
// Pure CSS keyframes; disabled under reduced-motion.
// -------------------------------------------------------------------------

export interface PulseProps {
  color?: string;
  size?: number;
}

export const Pulse: React.FC<PulseProps> = ({ color = DEFAULT_COLOR, size = 10 }) => {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        width: size,
        height: size,
      }}
    >
      {/* Expanding halo ring. */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: color,
          opacity: 0.6,
          animation: "causarium-pulse 1.6s ease-out infinite",
        }}
      />
      {/* Solid core dot. */}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          boxShadow: "0 0 " + size * 0.8 + "px " + color,
        }}
      />
      <style>{
        "@keyframes causarium-pulse{" +
        "0%{transform:scale(1);opacity:0.6}" +
        "70%{transform:scale(2.4);opacity:0}" +
        "100%{transform:scale(2.4);opacity:0}}" +
        "@media (prefers-reduced-motion: reduce){" +
        "span[style*='causarium-pulse']{animation:none!important;opacity:0!important}}"
      }</style>
    </span>
  );
};
