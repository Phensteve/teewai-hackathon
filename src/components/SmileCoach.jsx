// Adaptive Smile Coach — Macro Factor's "auto-adjusting plan" pattern.
// Reads the user's real scan pace (shades/week from first → latest scan) and
// compares it to the target pace implied by the latest scan's
// whitening_potential + weeks_to_potential. Surfaces a weekly recalibration:
// ahead of pace, on pace, or behind pace — with a concrete adjustment.
// Pure client-side, derived from existing Scan fields. Needs ≥2 scored scans.
import { useMemo } from 'react';
import { Activity, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export default function SmileCoach({ scans }) {
  const c = useMemo(() => {
    const scored = scans.filter((s) => typeof s.score === 'number');
    if (scored.length < 2) return null;
    const first = scored[scored.length - 1];
    const latest = scored[0];
    const weeks = (new Date(latest.created_date) - new Date(first.created_date)) / MS_PER_WEEK;
    if (weeks < 0.5) return null; // not enough elapsed time to measure pace

    const realPace = (latest.score - first.score) / weeks; // pts/week
    const target = latest.whitening_potential_score;
    const weeksToPotential = latest.weeks_to_potential;
    let targetPace = null;
    if (typeof target === 'number' && typeof weeksToPotential === 'number' && weeksToPotential > 0) {
      targetPace = (target - latest.score) / weeksToPotential;
    }

    // Ahead / on / behind relative to the target pace.
    let state = 'on';
    let Icon = CheckCircle2;
    let headline = "You're on pace";
    let body = `Your smile is moving ${Math.abs(realPace).toFixed(1)} pts/week${realPace >= 0 ? ' brighter' : ' darker'}. Keep your current routine — it's working.`;
    let adjustment = null;

    if (targetPace != null) {
      const ratio = targetPace > 0 ? realPace / targetPace : 1;
      if (ratio >= 1.15) {
        state = 'ahead';
        Icon = TrendingUp;
        const earlyWeeks = Math.max(0, weeksToPotential * (1 - 1 / ratio));
        headline = "You're ahead of pace";
        body = `At ${realPace.toFixed(1)} pts/week you're outpacing your target (${targetPace.toFixed(1)} pts/week).`;
        adjustment = earlyWeeks >= 0.5
          ? `You'll reach your target shade about ${Math.round(earlyWeeks)} week${Math.round(earlyWeeks) === 1 ? '' : 's'} early. Hold the routine — no need to push harder.`
          : "You'll reach your target shade ahead of schedule. Hold the routine.";
      } else if (ratio < 0.85) {
        state = 'behind';
        Icon = AlertCircle;
        headline = "You're behind pace";
        body = `At ${realPace.toFixed(1)} pts/week you're trailing your target (${targetPace.toFixed(1)} pts/week).`;
        adjustment = "Add one extra brush cycle this week and rinse with water after every staining drink. A small, consistent bump closes the gap — don't over-whiten.";
      }
    } else if (realPace < -0.5) {
      state = 'behind';
      Icon = AlertCircle;
      headline = "Your shade is drifting back";
      body = `You're losing ${Math.abs(realPace).toFixed(1)} pts/week.`;
      adjustment = "Log your staining drinks and brush nightly — the drift reverses fast once you close the loop.";
    }

    return { state, Icon, headline, body, adjustment, realPace, targetPace, weeks: weeks.toFixed(1) };
  }, [scans]);

  if (!c) return null;
  const { state, Icon, headline, body, adjustment, weeks } = c;
  const toneCls = state === 'ahead'
    ? 'border-olo/30 bg-olo/5'
    : state === 'behind'
      ? 'border-warning/30 bg-warning/5'
      : 'border-border bg-card';
  const iconCls = state === 'ahead' ? 'icon-tool' : state === 'behind' ? 'bg-warning/15 text-warning rounded-xl' : 'icon-tool';

  return (
    <div className={`p-5 rounded-3xl border ${toneCls}`}>
      <div className="flex items-start gap-3">
        <span className={iconCls} style={{ width: '2.25rem', height: '2.25rem' }}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Activity className="w-3.5 h-3.5 text-olo" />
            <p className="text-label text-muted-foreground">Smile Coach · weekly recalibration</p>
          </div>
          <h3 className="font-heading font-600 text-base">{headline}</h3>
          <p className="text-caption text-muted-foreground mt-1">{body}</p>
          {adjustment && (
            <p className="text-caption text-foreground mt-2 leading-relaxed">{adjustment}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">Measured over {weeks} week{weeks === '1' ? '' : 's'} of your scan history.</p>
        </div>
      </div>
    </div>
  );
}