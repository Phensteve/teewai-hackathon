import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ScanImage from '@/components/ScanImage';
import { shadeDeltaSteps } from '@/lib/baseline';

// Memoized scan-history row. React.memo prevents every row from re-rendering
// when the parent's tab/direction state changes or when a single scan is
// added/removed — only the affected rows re-render.
const ScanRow = React.memo(function ScanRow({ scan, prev, isBaseline, isLatest }) {
  const s = scan;
  const steps =
    prev && s.shade_code && prev.shade_code
      ? shadeDeltaSteps(s.shade_code, prev.shade_code)
      : null;
  // Von Restorff isolate: baseline (heavier border) and latest stand out.
  const rowCls = isBaseline
    ? 'flex items-center gap-4 p-4 rounded-2xl border-2 border-olo bg-card shadow-2'
    : isLatest
      ? 'flex items-center gap-4 p-4 rounded-2xl border border-olo bg-card shadow-2'
      : 'flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-olo/40 transition-colors';

  return (
    <Link to={`/results/${s.id}`} className={rowCls}>
      <ScanImage
        url={s.image_url}
        alt="Scan"
        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">
            {new Date(s.created_date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          {isBaseline && (
            <span className="text-[10px] font-semibold text-olo bg-olo/15 px-1.5 py-0.5 rounded-full">
              Baseline
            </span>
          )}
          {isLatest && (
            <span className="text-[10px] font-semibold text-olo bg-olo/15 px-1.5 py-0.5 rounded-full">
              Latest
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Shade {s.shade || '—'} · {s.capture_position}
        </p>
      </div>
      {steps != null && steps !== 0 && (
        <span
          className={`text-label font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
            steps > 0 ? 'text-olo bg-olo/10' : 'text-warning bg-warning/10'
          }`}
        >
          {steps > 0 ? '+' : ''}
          {steps} shade{Math.abs(steps) !== 1 ? 's' : ''}
        </span>
      )}
      <div className="text-right flex-shrink-0">
        <p className="font-heading font-700 text-olo text-lg leading-none tabular-nums">
          {s.score ?? '—'}
        </p>
        <p className="text-caption text-muted-foreground mt-0.5">whiteness</p>
      </div>
      <div className="text-right hidden sm:block flex-shrink-0">
        <p className="font-heading font-700 text-success text-lg leading-none tabular-nums">
          {s.dental_health_score ?? '—'}
        </p>
        <p className="text-caption text-muted-foreground mt-0.5">health</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
});

export default ScanRow;