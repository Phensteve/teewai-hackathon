import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Award, CalendarClock, Share2 } from 'lucide-react';
import { shadeIndex } from '@/lib/vitaShade';
import { formatShadeDelta } from '@/lib/baseline';
import { useToast } from '@/components/ui/use-toast';

function avg(arr) { return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null; }

export default function MilestoneChips({ scans }) {
  const { toast } = useToast();
  const data = useMemo(() => {
    if (!scans || scans.length < 2) return null;
    const sorted = [...scans].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    const latest = sorted[sorted.length - 1];

    // Trend: average of last 3 vs the 3 before that.
    const recent = sorted.slice(-3).map(s => s.score).filter(x => x != null);
    const older = sorted.slice(-6, -3).map(s => s.score).filter(x => x != null);
    let trend = 'stable';
    if (recent.length && older.length) {
      const delta = Math.round(avg(recent) - avg(older));
      if (delta > 1) trend = 'improving';
      else if (delta < -1) trend = 'declining';
    }

    // Milestone: latest shade vs the previous calendar month's average shade
    // index (ordinal, so averaging indices is a fair comparison).
    let milestone = null;
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevIdxs = sorted
      .filter(s => {
        const d = new Date(s.created_date);
        return d >= prevMonth && d < prevMonthEnd && s.shade_code;
      })
      .map(s => shadeIndex(s.shade_code))
      .filter(i => i >= 0);
    const latestIdx = shadeIndex(latest.shade_code);
    if (prevIdxs.length && latestIdx >= 0) {
      const steps = Math.round(avg(prevIdxs) - latestIdx); // positive = lighter
      const label = formatShadeDelta(steps);
      const monthName = prevMonth.toLocaleDateString(undefined, { month: 'long' });
      if (label && steps !== 0) milestone = `${label[0].toUpperCase()}${label.slice(1)} than your ${monthName} average`;
    }

    // Cadence: days since the most recent scan.
    const daysSince = Math.floor((Date.now() - new Date(latest.created_date).getTime()) / 86400000);
    return { trend, milestone, daysSince };
  }, [scans]);

  if (!data) return null;

  const trendChip = data.trend === 'improving'
    ? { icon: TrendingUp, color: 'text-olo', bg: 'bg-olo/10 border-olo/20', label: 'Improving' }
    : data.trend === 'declining'
      ? { icon: TrendingDown, color: 'text-warning', bg: 'bg-warning/10 border-warning/20', label: 'Declining' }
      : { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted/40 border-border', label: 'Stable' };
  const TrendIcon = trendChip.icon;

  const share = async () => {
    const text = data.milestone
      ? `My teewai shade trend: ${data.milestone.toLowerCase()}.`
      : 'Tracking my smile shade on teewai.';
    try {
      if (navigator.share) await navigator.share({ title: 'teewai', text });
      else { await navigator.clipboard?.writeText(text); toast({ title: 'Copied', description: 'Milestone copied to clipboard.' }); }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${trendChip.bg} ${trendChip.color}`}>
        <TrendIcon className="w-3.5 h-3.5" /> {trendChip.label}
      </span>
      {data.milestone && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-olo/20 bg-olo/5 text-xs font-medium text-olo">
          <Award className="w-3.5 h-3.5" /> {data.milestone}
          <button onClick={share} aria-label="Share milestone" className="ml-0.5 hover:opacity-70">
            <Share2 className="w-3 h-3" />
          </button>
        </span>
      )}
      {data.daysSince >= 2 && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/40 text-xs text-muted-foreground">
          <CalendarClock className="w-3.5 h-3.5" /> Last scan {data.daysSince} day{data.daysSince === 1 ? '' : 's'} ago
        </span>
      )}
    </div>
  );
}