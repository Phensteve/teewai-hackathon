import { useMemo } from 'react';
import { Activity } from 'lucide-react';

// Micro-shade progression — surfaces tiny daily deltas so progress always feels moving.
// Even between real scans we project a plausible micro-fluctuation from the latest trend.
export default function MicroShadeProgress({ scans }) {
  const data = useMemo(() => {
    if (!scans.length) return null;
    const latest = scans[0];
    const prev = scans[1];
    const cur = latest?.score ?? 0;
    let delta = 0;
    if (prev) {
      const daySpan = Math.max(1, (new Date(latest.created_date) - new Date(prev.created_date)) / 86400000);
      delta = (cur - (prev?.score ?? cur)) / daySpan; // per-day change
    } else {
      // No prior scan: show a small optimistic micro-drift
      delta = 0.04;
    }
    const pct = +(delta).toFixed(2);
    const positive = pct >= 0;
    return { pct, positive, hasPrev: Boolean(prev) };
  }, [scans]);

  if (!data) return null;

  return (
    <div className="p-4 rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-olo" />
        <h4 className="font-heading font-600 text-sm">Micro-shade progression</h4>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {data.hasPrev ? "Per-day shift since your last scan" : "Projected daily micro-drift"}
          </p>
          <p className={`text-2xl font-heading font-700 ${data.positive ? 'text-olo' : 'text-amber-500'}`}>
            {data.positive ? '+' : ''}{data.pct}<span className="text-sm">/day</span>
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${data.positive ? 'bg-olo/10 text-olo' : 'bg-amber-500/10 text-amber-500'}`}>
          {data.positive ? 'brightening' : 'slipping'}
        </div>
      </div>
    </div>
  );
}