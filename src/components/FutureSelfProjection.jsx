import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Wand2, Activity } from 'lucide-react';

// Future-Self projection — loss-aversion tool.
// Shows the smile you're growing into WITH daily care vs the one at stake WITHOUT it,
// at 3 / 6 / 12 months. Makes the impact of a daily routine concrete and motivating.
export default function FutureSelfProjection({ scans }) {
  const [months, setMonths] = useState(3);

  const { current, currentShade, withCare, withCareShade, withoutCare, withoutCareShade, potential } = useMemo(() => {
    const latest = scans[0];
    const oldest = scans[scans.length - 1];
    const cur = latest?.score ?? 60;
    let perMonth = 0;
    if (scans.length >= 2) {
      const spanDays = Math.max(1, (new Date(latest.created_date) - new Date(oldest.created_date)) / 86400000);
      const spanMonths = Math.max(0.5, spanDays / 30);
      perMonth = (cur - (oldest?.score ?? cur)) / spanMonths;
    }
    const pot = latest?.whitening_potential_score ?? Math.min(100, cur + 15);
    const frac = 1 - Math.exp(-months / 4);
    const withC = Math.round(cur + (pot - cur) * frac);
    const withoutC = Math.max(0, Math.round(cur - months * 0.6 + Math.min(0, perMonth) * months * 0.3));
    return {
      current: Math.round(cur),
      currentShade: latest?.shade,
      withCare: withC,
      withCareShade: latest?.whitening_potential_shade,
      withoutCare: withoutC,
      withoutCareShade: undefined,
      potential: Math.round(pot),
    };
  }, [scans, months]);

  const delta = withCare - withoutCare;
  const maxBar = 100;

  const projectedShade = (score) => {
    if (score >= 90) return 'A1';
    if (score >= 80) return 'A2';
    if (score >= 70) return 'A3';
    if (score >= 60) return 'B1';
    if (score >= 50) return 'B2';
    return 'C1';
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Wand2 className="w-5 h-5 text-olo" />
        <h3 className="font-heading font-600 text-lg">Future-self projection</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        The smile you're growing into — and the one at stake if your daily routine slips.
      </p>

      {/* Time selector */}
      <div className="flex gap-2 mb-5">
        {[3, 6, 12].map((m) => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              months === m
                ? 'bg-olo text-white olo-glow'
                : 'bg-muted/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            {m} months
          </button>
        ))}
      </div>

      {/* Projection bars */}
      <div className="space-y-4 mb-5">
        {/* With care */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="flex items-center gap-1.5 text-olo font-medium">
              <TrendingUp className="w-4 h-4" /> With your daily routine
            </span>
            <span className="font-heading font-700 text-olo">
              {withCare} <span className="text-xs font-normal text-muted-foreground">· shade {withCareShade || projectedShade(withCare)}</span>
            </span>
          </div>
          <div className="h-7 rounded-full bg-muted overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-olo to-emerald-400 transition-all duration-500"
              style={{ width: `${(withCare / maxBar) * 100}%` }}
            />
          </div>
        </div>
        {/* Without care */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="flex items-center gap-1.5 text-amber-500 font-medium">
              <TrendingDown className="w-4 h-4" /> If you stop caring
            </span>
            <span className="font-heading font-700 text-amber-500">
              {withoutCare} <span className="text-xs font-normal text-muted-foreground">· shade {projectedShade(withoutCare)}</span>
            </span>
          </div>
          <div className="h-7 rounded-full bg-muted overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
              style={{ width: `${(withoutCare / maxBar) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Now reference */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
        <span>Today: <span className="font-semibold text-foreground">{current}</span> · shade {currentShade || projectedShade(current)}</span>
        <span>Target: <span className="font-semibold text-foreground">{potential}</span></span>
      </div>

      {/* Motivating takeaway */}
      <div className="p-4 rounded-2xl bg-olo-deep text-white">
        <div className="flex items-center gap-2 mb-1.5">
          <Activity className="w-4 h-4 text-olo" />
          <p className="font-heading font-700 text-base">Your daily routine is worth +{delta} points</p>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          {months === 12 ? 'A year' : `${months} months`} of consistent care takes you to{' '}
          <span className="text-olo font-semibold">shade {withCareShade || projectedShade(withCare)}</span>.
          Let it slip and stains creep back to{' '}
          <span className="text-amber-400 font-semibold">shade {projectedShade(withoutCare)}</span>.
          That gap — {delta} whiteness points — is the exact payoff of showing up every day.
        </p>
        <p className="text-xs text-white/50 mt-3 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-olo" /> One scan a day keeps the brighter future locked in.
        </p>
      </div>
    </div>
  );
}