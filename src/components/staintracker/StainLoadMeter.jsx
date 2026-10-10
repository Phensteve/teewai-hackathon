// Today's stain load meter + calories + insight + protective actions.
// Pure presentational — all data and handlers come from the orchestrator.
import { Flame, Droplet, Check } from 'lucide-react';

export const stainColor = (lvl) =>
  lvl >= 60 ? 'bg-danger' : lvl >= 30 ? 'bg-warning' : lvl > 0 ? 'bg-olo' : 'bg-muted-foreground/40';

export default function StainLoadMeter({
  todayLoad,
  todayCalories,
  insight,
  insightCls,
  onRinse,
  onBrush,
}) {
  return (
    <div className="mt-6 p-5 rounded-3xl border border-border bg-card">
      <div className="flex items-end justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Today's stain load</span>
        <span className="font-heading font-700 text-2xl tabular-nums">{todayLoad}</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${stainColor(todayLoad)}`}
          style={{ width: `${Math.min(100, todayLoad)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
        <span>Light</span>
        <span>Moderate</span>
        <span>Heavy</span>
      </div>
      <div className="mt-4 flex items-center gap-2 p-3 rounded-2xl bg-warning-soft">
        <Flame className="w-4 h-4 text-warning flex-shrink-0" />
        <span className="text-xs text-warning">
          <span className="font-semibold tabular-nums">{todayCalories}</span> kcal logged today
        </span>
      </div>
      <div className={`mt-3 p-3 rounded-2xl text-xs leading-relaxed ${insightCls}`}>
        {insight.text}
      </div>

      <div className="mt-3">
        <p className="text-xs text-muted-foreground mb-2">
          Just rinsed or brushed? Log it to reduce your stain load.
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={onRinse}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-olo/10 border border-olo/20 text-olo text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            <Droplet className="w-4 h-4" /> I just drank water
          </button>
          <button
            onClick={onBrush}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-olo/10 border border-olo/20 text-olo text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            <Check className="w-4 h-4" /> I just brushed
          </button>
        </div>
      </div>
    </div>
  );
}