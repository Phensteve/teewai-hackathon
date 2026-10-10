import { useMemo } from 'react';
import { TrendingUp, ShieldCheck, AlertTriangle, CalendarClock } from 'lucide-react';
import { saturateStainLoad } from '@/lib/stainLoad';

// 30-day stain forecast — projects the user's recent food/stain habits forward
// to estimate how much darker their teeth could drift in a month if the pace
// holds, with a tailored intervention tip. Pure client-side, built on existing
// StainLog data (pillar 2: "Food-to-Stain" prediction engine).
//
// Model: average saturated daily stain load over the last 14 active days →
// 30-day cumulative exposure → estimated VITA shade steps darker (~600
// cumulative saturated-load points per step). This is a wellness estimate,
// not a clinical measurement — the same disclaimer the tracker already shows.

const STEPS_PER_CUMULATIVE = 600;

export default function StainForecast({ logs }) {
  const f = useMemo(() => {
    const byDay = new Map();
    for (const l of logs) {
      if (!l.log_date) continue;
      if (!byDay.has(l.log_date)) byDay.set(l.log_date, []);
      byDay.get(l.log_date).push(l);
    }
    const days = [...byDay.entries()]
      .map(([date, items]) => ({
        date,
        load: saturateStainLoad(items.reduce((s, l) => s + (l.stain_level || 0), 0)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (days.length === 0) return null;

    const recent = days.slice(-14);
    const avgLoad = recent.reduce((s, d) => s + d.load, 0) / recent.length;
    const shadeSteps = Math.max(0, (avgLoad * 30) / STEPS_PER_CUMULATIVE);
    const stepsRounded = Math.round(shadeSteps * 10) / 10;

    let tone, label, Icon, tip;
    if (avgLoad < 25) {
      tone = 'good'; label = 'On track'; Icon = ShieldCheck;
      tip = 'Gentle pace — at this rate your shade should hold steady over the next 30 days. Keep rinsing after meals.';
    } else if (avgLoad < 50) {
      tone = 'warn'; label = 'Slow drift'; Icon = TrendingUp;
      tip = `At this pace, expect about ${stepsRounded} shade step${stepsRounded === 1 ? '' : 's'} darker in 30 days. Rinse with water after staining items to hold it back.`;
    } else {
      tone = 'alert'; label = 'Fast drift'; Icon = AlertTriangle;
      tip = `Heavy staining pace — roughly ${stepsRounded} shade steps darker in 30 days if habits hold. Brush nightly and rinse after every coffee, tea or wine to slow it sharply.`;
    }

    return { avgLoad: Math.round(avgLoad), stepsRounded, tone, label, Icon, tip, recent };
  }, [logs]);

  if (!f) return null;
  const { avgLoad, stepsRounded, tone, label, Icon, tip, recent } = f;
  const toneCls = tone === 'good'
    ? 'text-olo bg-olo/10'
    : tone === 'warn'
      ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
      : 'text-rose-600 dark:text-rose-400 bg-rose-500/10';
  const barColor = tone === 'good' ? 'bg-olo' : tone === 'warn' ? 'bg-amber-500' : 'bg-rose-500';
  const maxRecent = Math.max(60, ...recent.map((d) => d.load));

  return (
    <div className="mt-4 p-5 rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="font-heading font-700 text-lg tracking-tight">30-day stain forecast</h2>
          <p className="text-xs text-muted-foreground">Where your habits are taking your smile.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${toneCls}`}>
          <Icon className="w-3.5 h-3.5" /> {label}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="rounded-2xl bg-muted/50 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg daily load</p>
          <p className="font-heading font-700 text-lg">{avgLoad}<span className="text-xs text-muted-foreground font-400">/100</span></p>
        </div>
        <div className="rounded-2xl bg-muted/50 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">~Darker in 30 days</p>
          <p className="font-heading font-700 text-lg">{stepsRounded}<span className="text-xs text-muted-foreground font-400"> VITA steps</span></p>
        </div>
      </div>

      {/* Recent daily loads — compact bar sparkline */}
      <div className="mt-4 flex items-end gap-1 h-12">
        {recent.map((d) => (
          <div
            key={d.date}
            className={`flex-1 rounded-t-sm ${barColor}`}
            style={{ height: `${Math.max(6, (d.load / maxRecent) * 100)}%`, opacity: 0.45 + 0.55 * (d.load / maxRecent) }}
            title={`${d.date}: ${d.load}`}
          />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
        <CalendarClock className="w-3 h-3" /> Recent {recent.length} active day{recent.length === 1 ? '' : 's'}
      </p>

      {/* Tailored intervention tip */}
      <div className={`mt-3 p-3 rounded-2xl text-xs leading-relaxed ${toneCls}`}>
        {tip}
      </div>
    </div>
  );
}