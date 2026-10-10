import { useMemo } from 'react';
import { Zap, TrendingUp, Clock } from 'lucide-react';

// Whiteness Velocity Multiplier — the Subway Surfers "multiplier" mechanic.
// Instead of a static "you need 30 more days to reach A1," this shows how the
// user's consistency (streak) *accelerates* their projected shade target date.
// The multiplier makes each action feel like it has compounding impact, not
// linear progress — the core of Subway Surfers' high-frequency feedback loop.
//
// The math: base velocity = improvement / days between first and latest scan.
// The multiplier scales with streak (consistency), so a 14-day streak projects
// a 2.5× faster path to the target than a cold start. The card shows the
// accelerated date and the days saved vs. the base rate.

const TARGET_SCORE = 85; // VITA A1 ≈ 85 on the teewai whiteness scale

function getMultiplier(streak) {
  if (streak >= 14) return 2.5;
  if (streak >= 7) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

export default function VelocityMultiplier({ scans, streak, latest }) {
  const data = useMemo(() => {
    if (!scans || scans.length < 2 || !latest?.score) return null;

    const newest = scans[0];
    const oldest = scans[scans.length - 1];
    const daysSpan = Math.max(1, (new Date(newest.created_date) - new Date(oldest.created_date)) / 86400000);
    const improvement = (newest.score || 0) - (oldest.score || 0);
    const perDay = improvement / daysSpan;

    const current = latest.score;
    const gap = TARGET_SCORE - current;

    if (current >= TARGET_SCORE) {
      return { reached: true, perDay, multiplier: getMultiplier(streak) };
    }
    if (perDay <= 0) {
      return { reached: false, noVelocity: true, perDay, multiplier: getMultiplier(streak), current, gap };
    }

    const multiplier = getMultiplier(streak);
    const baseDays = Math.ceil(gap / perDay);
    const accelDays = Math.ceil(gap / (perDay * multiplier));
    const daysSaved = baseDays - accelDays;
    const targetDate = new Date(Date.now() + accelDays * 86400000);

    return { reached: false, perDay, multiplier, baseDays, accelDays, daysSaved, targetDate, current, gap };
  }, [scans, streak, latest]);

  if (!data) return null;

  // Already at target
  if (data.reached) {
    return (
      <div className="p-4 rounded-2xl border border-olo/20 bg-gradient-to-br from-olo/8 to-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-600 text-sm">Target reached — A1 velocity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">You're at VITA A1. Keep scanning to maintain your glow.</p>
          </div>
        </div>
      </div>
    );
  }

  // Not enough velocity yet
  if (data.noVelocity) {
    return (
      <div className="p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-olo" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-600 text-sm">Build your whiteness velocity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Scan consistently to unlock your velocity multiplier — teewai will project how fast you're heading to A1.
            </p>
          </div>
          {data.multiplier > 1 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-olo/10 text-olo text-xs font-bold">
              <Zap className="w-3 h-3" /> {data.multiplier}×
            </span>
          )}
        </div>
      </div>
    );
  }

  // Active velocity — the core reveal
  const dateStr = data.targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="p-4 rounded-2xl border border-olo/20 bg-gradient-to-br from-olo/8 to-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-600 text-sm">Whiteness velocity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.perDay > 0 ? `+${data.perDay.toFixed(1)} pts/day` : 'Building baseline…'}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-olo text-white text-xs font-bold olo-glow">
          <Zap className="w-3 h-3" /> {data.multiplier}× multiplier
        </span>
      </div>

      {/* Kinetic progress bar — current → A1 target */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>Now · {data.current}</span>
          <span>Target · A1 ({TARGET_SCORE})</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-olo to-olo-glow transition-all duration-1000"
            style={{ width: `${Math.max(3, Math.min(100, (data.current / TARGET_SCORE) * 100))}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Clock className="w-3.5 h-3.5 text-olo flex-shrink-0" />
        {data.daysSaved > 0 ? (
          <p className="text-muted-foreground">
            AI projects <span className="text-olo font-semibold">{dateStr}</span> ·{' '}
            <span className="text-olo font-semibold">{data.daysSaved} day{data.daysSaved !== 1 ? 's' : ''} faster</span> at your current streak
          </p>
        ) : (
          <p className="text-muted-foreground">
            AI projects <span className="text-olo font-semibold">{dateStr}</span> at your current pace
          </p>
        )}
      </div>
    </div>
  );
}