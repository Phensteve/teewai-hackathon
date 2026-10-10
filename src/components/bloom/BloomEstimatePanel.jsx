import { HABIT_STYLES } from '@/lib/habitColors';

// Color-coded habit extrapolation panel — shows the user's estimated whiteness
// between scans, broken down by each care action type in its own color.
// Stain logs pull it down (amber), brushing restores it (teal), water rinses
// mitigate (blue), mouthwash mitigates (mint). Each in its individual color so
// the user can see exactly how their logged habits affect their shade.
export default function BloomEstimatePanel({ estimate }) {
  if (!estimate) return null;

  const items = [
    { key: 'stain', value: estimate.effects?.stain, count: estimate.counts?.stain, sign: '−' },
    { key: 'brush', value: estimate.effects?.brush, count: estimate.counts?.brush, sign: '+' },
    { key: 'water', value: estimate.effects?.water, count: estimate.counts?.water, sign: '+' },
    { key: 'mouthwash', value: estimate.effects?.mouthwash, count: estimate.counts?.mouthwash, sign: '+' },
  ].filter((i) => i.count > 0 && i.value > 0);

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estimated whiteness</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-heading font-700 tabular-nums text-olo">{estimate.estimate}</span>
          {estimate.degradation > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">/ {estimate.anchorScore}</span>
          )}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-1.5 mb-3">
          {items.map((i) => {
            const style = HABIT_STYLES[i.key];
            return (
              <div key={i.key} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: style.color }} />
                <span className="flex-1 text-muted-foreground">{style.label}</span>
                <span className="font-medium tabular-nums" style={{ color: style.color }}>
                  {i.sign}{i.value.toFixed(1)} pts
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground mb-3">
          No habits logged since your last scan. Your estimate matches your real score.
        </p>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Estimated shade until your next scan. Stain logs pull it down, brushing restores it,
        water and mouthwash rinses mitigate it — each shown in its own color above. A new scan
        resets this to your real measured score.
      </p>
    </div>
  );
}