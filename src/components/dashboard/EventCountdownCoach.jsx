import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarHeart, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { scans as insforgeScans, homeWhiteningMethods } from '@/lib/insforgeDb';
import { shadeDeltaSteps } from '@/lib/baseline';

// Event Countdown Coach — anticipatory pacing for a user's smile goal.
// Uses SmileGoal (event_date, event_name, target_shade) + the latest Scan
// (shade_code, weeks_to_potential) to show dynamic pacing on the home screen:
// "21 days until your wedding. You're 2 shades away — on track."
//
// If the event is < 7 days out, surfaces a safe "Pre-Event Acceleration
// Protocol" from HomeWhiteningMethod (respecting safety_notes).

const EVENT_TYPE_LABEL = {
  wedding: 'wedding', interview: 'interview', date: 'date',
  photoshoot: 'photo shoot', graduation: 'graduation', reunion: 'reunion', other: 'big day',
};

export default function EventCountdownCoach() {
  const [goal, setGoal] = useState(null);
  const [latest, setLatest] = useState(null);
  const [methods, setMethods] = useState([]);
  const [now, setNow] = useState(new Date());

  // Live ticking countdown — updates every second for the days/hrs/mins/secs
  // hero widget. daysLeft (ceil) only changes at day boundaries, so the
  // acceleration-protocol effect below doesn't re-fetch every tick.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [goals, scanList] = await Promise.all([
          unrufld.entities.SmileGoal.filter({}, '-created_date', 10).catch(() => []),
          insforgeScans.list('-created_date', 1).catch(() => []),
        ]);
        const now = new Date();
        const active = goals
          .filter((g) => !g.completed && g.event_date && new Date(g.event_date) >= now)
          .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))[0];
        if (!active) return;
        setGoal(active);
        if (scanList[0]) setLatest(scanList[0]);
      } catch {}
    })();
  }, []);

  const diff = goal ? new Date(goal.event_date).getTime() - now.getTime() : 0;
  const daysLeft = goal ? Math.max(0, Math.ceil(diff / 86400000)) : 0;
  const hoursLeft = goal ? Math.max(0, Math.floor((diff % 86400000) / 3600000)) : 0;
  const minsLeft = goal ? Math.max(0, Math.floor((diff % 3600000) / 60000)) : 0;
  const secsLeft = goal ? Math.max(0, Math.floor((diff % 60000) / 1000)) : 0;
  const weeksLeft = daysLeft / 7;

  // Shade gap: how far the current shade is from the target.
  // shadeDeltaSteps(current, reference) = shadeIndex(reference) - shadeIndex(current).
  // Positive = target is lighter = user needs to get brighter.
  const currentShade = latest?.shade_code || latest?.shade;
  const targetShade = goal?.target_shade;
  const shadeGap = currentShade && targetShade ? shadeDeltaSteps(currentShade, targetShade) : null;
  const gapAbs = shadeGap != null ? Math.abs(shadeGap) : null;
  const onTrack = latest?.weeks_to_potential != null ? latest.weeks_to_potential <= weeksLeft : null;

  // Pre-Event Acceleration Protocol (< 7 days) — safe, fast methods.
  useEffect(() => {
    if (!goal || daysLeft >= 7) return;
    let active = true;
    (async () => {
      try {
        const all = await homeWhiteningMethods.list('sortOrder', 50).catch(() => []);
        if (!active) return;
        const safe = all
          .filter((m) => m.safety_score == null || m.safety_score >= 70)
          .slice(0, 3);
        if (active) setMethods(safe);
      } catch {}
    })();
    return () => { active = false; };
  }, [goal, daysLeft]);

  if (!goal) return null;

  const eventLabel = EVENT_TYPE_LABEL[goal.event_type] || 'big day';

  return (
    <div className="relative p-5 sm:p-6 rounded-3xl border border-olo/20 bg-card frost-edge overflow-hidden">
      <div className="absolute inset-0 radial-olo opacity-20 pointer-events-none" />
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
              <CalendarHeart className="w-5 h-5 text-olo" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-600 text-base truncate">{goal.event_name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{eventLabel} · {new Date(goal.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
          <Link to="/smile-goal" className="text-muted-foreground hover:text-olo transition-colors flex-shrink-0" aria-label="Edit smile goal">
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Live countdown — days / hrs / mins / secs hero widget */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { v: daysLeft, l: 'days' },
            { v: hoursLeft, l: 'hrs' },
            { v: minsLeft, l: 'mins' },
            { v: secsLeft, l: 'secs' },
          ].map((u) => (
            <div key={u.l} className="text-center p-2 rounded-xl bg-olo/5 border border-olo/10">
              <p className="text-2xl font-heading font-800 text-olo leading-none tabular-nums">{String(u.v).padStart(2, '0')}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{u.l}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {eventLabel} · {new Date(goal.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(goal.event_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} your time
        </p>

        {/* Pacing */}
        <div className="p-3 rounded-xl bg-olo/5 border border-olo/10 mb-4">
          {gapAbs != null ? (
            <>
              <p className="text-sm font-medium">
                {gapAbs === 0
                  ? "You've reached your target shade"
                  : `${gapAbs} shade${gapAbs !== 1 ? 's' : ''} away from ${targetShade}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {onTrack === true && 'On track — keep your routine.'}
                {onTrack === false && 'Behind pace — consider an acceleration method below.'}
                {onTrack === null && 'Scan regularly to track your pace.'}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Scan to measure your pace toward {targetShade || 'your target'}.</p>
          )}
        </div>

        {/* Pre-Event Acceleration Protocol */}
        {daysLeft < 7 && methods.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-olo" />
              <p className="text-xs font-semibold uppercase tracking-wider text-olo">Pre-Event Acceleration Protocol</p>
            </div>
            <div className="space-y-2">
              {methods.map((m) => (
                <div key={m.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-olo/5 border border-olo/10">
                  <ShieldCheck className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.short_description}</p>
                    {m.safety_notes && (
                      <p className="text-[11px] text-warning mt-1">Safety: {m.safety_notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Link to="/home-whitening" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-olo hover:gap-2.5 transition-all">
              See all methods <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}