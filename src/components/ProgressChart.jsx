// Shade-progression chart wrapper. Splits the recharts dependency behind a
// lazy boundary so the heavy recharts chunk only loads when a user has ≥2
// scans (the chart renders nothing useful below that). New users — the most
// connection-sensitive — never download recharts on their first Dashboard.
import { lazy, Suspense } from 'react';
import { TrendingUp } from 'lucide-react';
import Spinner from '@/components/Spinner';

const ProgressChartCanvas = lazy(() => import('@/components/ProgressChartCanvas'));

export default function ProgressChart({ scans }) {
  const data = [...scans].reverse().map((s, i) => ({
    scan: `Scan ${i + 1}`,
    date: new Date(s.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    whiteness: Math.round(s.score || 0),
    health: Math.round(s.dental_health_score || 0),
    shade: s.shade,
    shadeCode: s.shade_code,
    potential: s.whitening_potential_score != null ? Math.round(s.whitening_potential_score) : null,
  }));
  // Smoothed "true shade trend" — an exponential moving average that filters
  // single-scan lighting/capture noise so users see their real direction
  // instead of jitter (Macro Factor's Weight Trend pattern). alpha=0.4 keeps
  // it responsive while damping one-off spikes from bad lighting.
  const alpha = 0.4;
  let ema = data[0].whiteness;
  data.forEach((d, i) => {
    ema = i === 0 ? d.whiteness : alpha * d.whiteness + (1 - alpha) * ema;
    d.trend = Math.round(ema);
  });

  if (data.length < 2) {
    return (
      <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card text-center">
        <TrendingUp className="w-8 h-8 text-olo mx-auto mb-2" />
        <h3 className="font-heading font-600 text-base mb-1">Shade progression</h3>
        <p className="text-sm text-muted-foreground">Take at least 2 scans to see your whitening trend over time.</p>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card flex items-center justify-center min-h-[260px]">
        <Spinner />
      </div>
    }>
      <ProgressChartCanvas data={data} />
    </Suspense>
  );
}