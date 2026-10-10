import { useState } from 'react';
import { ChevronDown, RefreshCw, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { computeOverallDelta, computePerToothDeltas, formatBaselineDate, isFlagged } from '@/lib/baseline';

// Results screen: "What changed since your last scan" — a scan-to-scan
// comparison (distinct from the baseline card). Collapsed by default,
// expands to per-tooth deltas vs the previous scan. Same accordion pattern
// as the baseline card. Only shows when there is a previous scan to compare.
export default function WhatChangedCard({ currentScan, previousScan }) {
  const [expanded, setExpanded] = useState(false);

  if (!previousScan) return null;
  if (isFlagged(currentScan) || isFlagged(previousScan)) return null;
  if (currentScan.id === previousScan.id) return null;

  const delta = computeOverallDelta(currentScan, previousScan);
  const toothDeltas = computePerToothDeltas(currentScan, previousScan);
  const prevDate = formatBaselineDate(previousScan.created_date);

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
        <span className="icon-tool"><RefreshCw /></span>
        <div className="flex-1 min-w-0">
          <p className="text-caption font-medium">
            Since your last scan{prevDate ? ` (${prevDate})` : ''}:{' '}
            <span className={`font-semibold ${accent}`}>{deltaLabel}</span>
            {scoreDelta != null && scoreDelta !== 0 && (
              <span className="text-muted-foreground font-normal"> ({scoreDelta > 0 ? '+' : ''}{scoreDelta} pts)</span>
            )}
          </p>
          {toothDeltas.length > 0 && (
            <p className="text-label text-muted-foreground">
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
                    <span className="text-label font-semibold">{t.tooth_id}</span>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-label text-muted-foreground leading-none">Now</p>
                      <p className="font-heading font-700 text-caption text-olo leading-tight tabular-nums">{Math.round(t.currentScore || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-label text-muted-foreground leading-none">Last</p>
                      <p className="text-label text-muted-foreground leading-tight tabular-nums">{Math.round(t.referenceScore || 0)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}