// Verdict.tsx
// The signature readout of CAUSARIUM: the leading future and how sure we are.
// Given a live outcome distribution it names the front-runner in an oversized
// display cut, counts the probability up as a big tabular figure, draws a slim
// lead bar, and keeps the runner-up in a quiet second line. Built to look
// premium both mid-run (values still moving) and at completion.
//
// Self-contained. No emojis. Reduced-motion safe (AnimatedNumber snaps; the
// lead bar animates via CSS transition which is inert under reduced motion CSS).

import React, { useMemo } from 'react';
import { AnimatedNumber } from './Live';

export interface VerdictProps {
  /** Raw outcome distribution: { outcomeKey: count }. */
  outcomes: Record<string, number>;
  /** Lens accent; the one bold color the verdict is allowed. */
  accent?: string;
  /** True while the run is still resolving timelines. */
  live?: boolean;
  /** Translate a raw outcome key into plain English (defaults to identity). */
  vocab?: (o: string) => string;
  /** Single-row treatment for a header strip. */
  compact?: boolean;
  className?: string;
}

const ACCENT = '#6C63FF';

export const Verdict: React.FC<VerdictProps> = ({
  outcomes,
  accent = ACCENT,
  live = false,
  vocab = (o) => o,
  compact = false,
  className = '',
}) => {
  const ranked = useMemo(() => {
    const total = Object.values(outcomes).reduce((a, b) => a + b, 0);
    return {
      total,
      rows: Object.entries(outcomes)
        .sort((a, b) => b[1] - a[1])
        .map(([key, n]) => ({ key, label: vocab(key), n, pct: total ? (n / total) * 100 : 0 })),
    };
  }, [outcomes, vocab]);

  const leader = ranked.rows[0];
  const runner = ranked.rows[1];
  const resolved = ranked.total > 0 && !!leader;
  // Lead = how far ahead of the field the front-runner sits (0..1).
  const lead = leader ? Math.min(1, leader.pct / 100) : 0;

  const eyebrow = (
    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.32em]" style={{ color: accent }}>
      <span>Leading future</span>
      {live && (
        <span className="inline-flex items-center gap-1.5 text-gray-500 tracking-normal normal-case">
          <span className="relative inline-flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: accent, opacity: 0.7 }} />
            <span className="relative inline-block w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
          </span>
          resolving
        </span>
      )}
    </div>
  );

  // ── Compact: a single disciplined row for a header strip. ────────────────
  if (compact) {
    return (
      <div className={`glass-deep hairline rounded-2xl px-5 py-3.5 flex items-center gap-5 ${className}`}>
        <div className="min-w-0 flex-1">
          {eyebrow}
          <div className="mt-1 flex items-baseline gap-3 min-w-0">
            <span key={leader?.key ?? 'none'} className="animate-settle font-display font-semibold text-white text-xl leading-none truncate" title={leader?.label}>
              {resolved ? leader!.label : 'Reading the futures'}
            </span>
            {resolved && runner && (
              <span className="text-gray-500 font-mono text-[11px] shrink-0 truncate">
                over {runner.label} · +{Math.round(leader!.pct - runner.pct)} pts
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right leading-none">
          <div className="font-display font-bold tabular-nums text-3xl" style={{ color: resolved ? accent : 'rgba(255,255,255,0.25)' }}>
            {resolved ? <AnimatedNumber value={leader!.pct} decimals={0} suffix="%" /> : '--'}
          </div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-gray-600 mt-1">confidence</div>
        </div>
      </div>
    );
  }

  // ── Full: the hero pronouncement. ────────────────────────────────────────
  return (
    <div className={`glass-deep hairline rounded-2xl px-6 py-5 overflow-hidden ${className}`}
      style={{ boxShadow: resolved ? `var(--shadow-key), 0 0 60px -30px ${accent}` : 'var(--shadow-key)' }}>
      <div className="grain absolute inset-0 pointer-events-none" aria-hidden />
      <div className="relative">
        {eyebrow}

        {resolved ? (
          <>
            <div className="mt-2.5 flex items-end justify-between gap-6">
              <div className="min-w-0">
                <div
                  key={leader!.key}
                  className="animate-settle font-display font-bold text-white leading-[0.95] truncate"
                  style={{ fontSize: 'clamp(1.9rem, 3.4vw, 3rem)', letterSpacing: '-0.02em' }}
                  title={leader!.label}
                >
                  {leader!.label}
                </div>
                <div className="mt-2 text-gray-500 font-mono text-[11px]">
                  leads across {ranked.total} resolved {ranked.total === 1 ? 'timeline' : 'timelines'}
                </div>
              </div>
              <div className="text-right shrink-0 leading-none">
                <div className="font-display font-bold tabular-nums" style={{ color: accent, fontSize: 'clamp(2.4rem, 4.4vw, 3.75rem)', textShadow: `0 0 34px ${accent}66` }}>
                  <AnimatedNumber value={leader!.pct} decimals={0} suffix="%" />
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.28em] text-gray-600 mt-1.5">confidence</div>
              </div>
            </div>

            {/* Slim lead bar — front-runner's share of the field. */}
            <div className="mt-4 relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${lead * 100}%`,
                  background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
                  boxShadow: `0 0 12px ${accent}88`,
                  transition: 'width 700ms cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            </div>

            {/* Runner-up, kept quiet. */}
            <div className="mt-3 flex items-center justify-between text-[12px] font-mono">
              {runner ? (
                <span className="text-gray-500 truncate">
                  Runner-up <span className="text-gray-300">{runner.label}</span>
                </span>
              ) : (
                <span className="text-gray-600">No contested runner-up</span>
              )}
              {runner && (
                <span className="text-gray-500 tabular-nums shrink-0 ml-4">{Math.round(runner.pct)}%</span>
              )}
            </div>
          </>
        ) : (
          <div className="mt-3">
            <div className="font-display font-semibold text-gray-400 leading-none animate-pulse" style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.1rem)' }}>
              Reading the futures
            </div>
            <div className="mt-2 text-gray-600 font-mono text-[11px]">
              The leading outcome will rise here as timelines resolve.
            </div>
            <div className="mt-4 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Verdict;
