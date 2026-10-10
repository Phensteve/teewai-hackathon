import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Camera } from 'lucide-react';
import ScanImage from '@/components/ScanImage';
import SetBaselineButton from '@/components/baseline/SetBaselineButton';
import { shadeFromScore } from '@/lib/unrufldteeth';

const POSITION_BADGE = { front: 'Front', top: 'Top', left: 'Left', right: 'Right' };

// Memoized teeth-scan row for the My Scans list. React.memo prevents every
// row from re-rendering when the mode tab switches or a single scan is
// added/removed — only the affected rows re-render.
const MyScanRow = React.memo(function MyScanRow({
  scan,
  baselineScanId,
  latestCompletedId,
  onSetBaseline,
}) {
  const s = scan;
  const score = s.score;
  const shade = s.shade || (score != null ? shadeFromScore(score).shade : null);
  const date = s.created_date ? new Date(s.created_date) : null;
  const isBaseline = s.id === baselineScanId;
  const isLatest = !isBaseline && s.id === latestCompletedId;
  // Von Restorff isolate: baseline (heavier border) and latest stand out.
  const rowCls = isBaseline
    ? 'flex items-center gap-4 p-3 rounded-2xl border-2 border-olo bg-card shadow-2'
    : isLatest
      ? 'flex items-center gap-4 p-3 rounded-2xl border border-olo bg-card shadow-2'
      : 'flex items-center gap-4 p-3 rounded-2xl border border-border bg-card hover:border-olo/40 hover:bg-olo/5 transition-colors';

  return (
    <Link to={`/results/${s.id}`} className={rowCls}>
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-olo-deep flex-shrink-0">
        {s.image_url ? (
          <ScanImage url={s.image_url} alt="scan" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-6 h-6 text-white/40 m-auto" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-heading font-700 text-lg text-olo">{score ?? '—'}</span>
          <span className="text-xs text-muted-foreground">whiteness</span>
          {s.scan_type === 'full' && (
            <span className="text-[10px] font-semibold text-olo bg-olo/15 px-1.5 py-0.5 rounded-full">
              FULL
            </span>
          )}
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
          {shade && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {shade}
            </span>
          )}
          {s.scan_for && (
            <span
              className="text-[10px] font-semibold text-olo bg-olo/10 px-1.5 py-0.5 rounded-full truncate max-w-[80px]"
              title={`Scanned for ${s.scan_for}`}
            >
              {s.scan_for}
            </span>
          )}
          <SetBaselineButton
            scan={s}
            isCurrentBaseline={s.id === baselineScanId}
            onSet={onSetBaseline}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {date
            ? date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—'}
          {s.capture_position && <span> · {POSITION_BADGE[s.capture_position] || s.capture_position}</span>}
          {s.dental_health_score != null && <span> · health {s.dental_health_score}</span>}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </Link>
  );
});

export default MyScanRow;