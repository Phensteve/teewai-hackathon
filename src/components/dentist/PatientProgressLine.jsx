import { TrendingUp, TrendingDown, Minus, Flag, Calendar } from 'lucide-react';
import { shadeDeltaSteps, formatShadeDelta, formatBaselineDate } from '@/lib/baseline';

// Dentist portal: a lean, read-only progress line for a patient. Shows scan
// count, baseline date (earliest scan), overall shade delta since baseline,
// and a simple trend indicator from the last 3 scans. No configuration —
// purely from existing scan data. Shows whenever the dentist can see the
// patient's scans (report data, not photos — so it shows even if photos
// are gated).
export default function PatientProgressLine({ scans }) {
  if (!scans || scans.length === 0) return null;

  // Scans are newest-first. Baseline = earliest scan (the smart default).
  const sorted = [...scans].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const baseline = sorted[0];
  const latest = sorted[sorted.length - 1];
  const baselineDate = formatBaselineDate(baseline.created_date);

  // Overall delta: latest vs baseline (shade steps).
  const steps = shadeDeltaSteps(latest.shade_code, baseline.shade_code);
  const deltaLabel = formatShadeDelta(steps);

  // Trend across last 3 scans (improving / stable / declining).
  let trend = 'stable';
  if (sorted.length >= 2) {
    const recent = sorted.slice(-3).map((s) => s.score).filter((v) => v != null);
    if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const diff = last - first;
      if (diff > 2) trend = 'improving';
      else if (diff < -2) trend = 'declining';
    }
  }

  const trendConfig = {
    improving: { icon: TrendingUp, label: 'Improving', color: 'text-olo' },
    stable: { icon: Minus, label: 'Stable', color: 'text-muted-foreground' },
    declining: { icon: TrendingDown, label: 'Declining', color: 'text-amber-500' },
  };
  const TrendIcon = trendConfig[trend].icon;

  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Flag className="w-3.5 h-3.5 text-olo" />
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Progress</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground leading-none">Scans</p>
          <p className="font-heading font-700 text-base mt-0.5">{scans.length}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground leading-none flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" /> Baseline
          </p>
          <p className="font-heading font-700 text-sm mt-0.5">{baselineDate || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground leading-none">Overall</p>
          <p className={`font-heading font-700 text-sm mt-0.5 ${steps > 0 ? 'text-olo' : steps < 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
            {deltaLabel || '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground leading-none">Trend</p>
          <p className={`font-heading font-700 text-sm mt-0.5 flex items-center gap-1 ${trendConfig[trend].color}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trendConfig[trend].label}
          </p>
        </div>
      </div>
    </div>
  );
}