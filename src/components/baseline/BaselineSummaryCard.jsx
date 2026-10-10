import { useState } from 'react';
import { ChevronDown, Flag, Check, ArrowUp, ArrowDown, Minus, Smile } from 'lucide-react';
import {
  computeOverallDelta,
  computeIdealDelta,
  computePerToothDeltas,
  formatBaselineDate,
  isPreBaseline,
  isFlagged,
} from '@/lib/baseline';

// Results screen: one baseline summary card under the score. Collapsed by
// default (one line), expands to per-tooth deltas vs the reference.
// Supports two reference types: "scan" (user's baseline scan) and "ideal"
// (generic ideal smile — positive framing, no per-tooth detail).
export default function BaselineSummaryCard({ currentScan, baselineScan, baselineType, onSetBaseline }) {
  const [expanded, setExpanded] = useState(false);

  if (isFlagged(currentScan)) return null;

  const isIdeal = baselineType === 'ideal';

  // --- Ideal smile reference ---
  if (isIdeal) {
    const delta = computeIdealDelta(currentScan);
    if (!delta) return null;
    const accent = delta.steps > 0 ? 'text-olo' : delta.steps < 0 ? 'text-warning' : 'text-muted-foreground';

    return (
      <div className="mb-4 rounded-2xl border border-border bg-card frost-edge overflow-hidden">
        <div className="w-full flex items-center gap-3 p-4 text-left">
          <div className="w-9 h-9 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
            <Smile className="w-4 h-4 text-olo" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              <span className={`font-semibold ${accent}`}>{delta.label}</span>
              {delta.scoreGap != null && delta.scoreGap > 0 && (
                <span className="text-muted-foreground font-normal"> · {delta.scoreGap} pts to go</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">Measured against the ideal A1 shade</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Scan reference (existing behavior) ---
  if (!baselineScan) return null;

  // This scan IS the baseline
  if (currentScan.id === baselineScan.id) {
    return (
      <div className="mb-4 p-4 rounded-2xl border border-olo/20 bg-olo/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
          <Flag className="w-4 h-4 text-olo" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">This is your baseline scan</p>
          <p className="text-xs text-muted-foreground">Your progress is measured from here.</p>
        </div>
      </div>
    );
  }

  // Pre-baseline scan: no delta
  if (isPreBaseline(currentScan, baselineScan)) return null;

  const delta = computeOverallDelta(currentScan, baselineScan);
  const toothDeltas = computePerToothDeltas(currentScan, baselineScan);
  const baselineDate = formatBaselineDate(baselineScan.created_date);

  const deltaLabel = delta?.label || 'no change';
  const scoreDelta = delta?.scoreDelta;
  const isLighter = delta?.steps > 0;
  const isDarker = delta?.steps < 0;
  const accent = isLighter ? 'text-olo' : isDarker ? 'text-warning' : 'text-muted-foreground';

  const improvedCount = toothDeltas.filter((t) => t.status === 'improved').length;
  const darkenedCount = toothDeltas.filter((t) => t.status === 'darkened').length;

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card frost-edge overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
          <Flag className="w-4 h-4 text-olo" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            Since your baseline{baselineDate ? ` (${baselineDate})` : ''}:{' '}
            <span className={`font-semibold ${accent}`}>{deltaLabel}</span>
            {scoreDelta != null && scoreDelta !== 0 && (
              <span className="text-muted-foreground font-normal"> ({scoreDelta > 0 ? '+' : ''}{scoreDelta} pts)</span>
            )}
          </p>
          {toothDeltas.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {improvedCount} teeth improved · {darkenedCount} darkened
            </p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && toothDeltas.length > 0 && (
        <div className="px-4 pb-3 animate-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {toothDeltas.map((t, i) => {
              const Icon = t.delta > 0 ? ArrowUp : t.delta < 0 ? ArrowDown : Minus;
              const color = t.delta > 0 ? 'text-olo' : t.delta < 0 ? 'text-warning' : 'text-muted-foreground';
              return (
                <div key={i} className="p-2.5 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{t.tooth_id}</span>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-none">Now</p>
                      <p className="font-heading font-700 text-sm text-olo leading-tight">{Math.round(t.currentScore || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground leading-none">Base</p>
                      <p className="text-xs text-muted-foreground leading-tight">{Math.round(t.referenceScore || 0)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {onSetBaseline && (
        <div className="px-4 pb-4">
          <button
            onClick={onSetBaseline}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-olo hover:underline"
          >
            <Check className="w-3.5 h-3.5" /> Set this scan as your baseline
          </button>
        </div>
      )}
    </div>
  );
}