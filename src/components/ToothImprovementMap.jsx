import { ScanFace, ArrowUp, ArrowDown, Minus } from 'lucide-react';

// Compares per-tooth whiteness between the earliest and latest scan that have
// tooth_analysis, showing each tooth's shade improvement over the journey.
export default function ToothImprovementMap({ scans }) {
  const withTeeth = scans.filter((s) => s.tooth_analysis && s.tooth_analysis.length > 0);
  if (withTeeth.length < 2) return null;

  const earliest = withTeeth[withTeeth.length - 1];
  const latest = withTeeth[0];

  const byId = (scan) => {
    const map = {};
    (scan.tooth_analysis || []).forEach((t) => { map[t.tooth_id] = t; });
    return map;
  };
  const oldTeeth = byId(earliest);
  const newTeeth = byId(latest);

  const teeth = (latest.tooth_analysis || []).filter((t) => oldTeeth[t.tooth_id]);

  if (!teeth.length) return null;

  const totalDelta = teeth.reduce((sum, t) => sum + ((t.whiteness_score || 0) - (oldTeeth[t.tooth_id].whiteness_score || 0)), 0);
  const avgDelta = totalDelta / teeth.length;
  const improved = teeth.filter((t) => (t.whiteness_score || 0) > (oldTeeth[t.tooth_id].whiteness_score || 0)).length;
  const declined = teeth.filter((t) => (t.whiteness_score || 0) < (oldTeeth[t.tooth_id].whiteness_score || 0)).length;

  const tier = (delta) => {
    if (delta >= 8) return { bg: 'bg-olo', text: 'text-olo', ring: 'border-olo/50', label: 'Big gain' };
    if (delta > 0) return { bg: 'bg-emerald-500', text: 'text-emerald-500', ring: 'border-emerald-500/40', label: 'Improved' };
    if (delta === 0) return { bg: 'bg-muted-foreground', text: 'text-muted-foreground', ring: 'border-border', label: 'Steady' };
    if (delta > -8) return { bg: 'bg-amber-500', text: 'text-amber-500', ring: 'border-amber-500/40', label: 'Slipping' };
    return { bg: 'bg-destructive', text: 'text-destructive', ring: 'border-destructive/40', label: 'Lost ground' };
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <ScanFace className="w-5 h-5 text-olo" />
        <h3 className="font-heading font-600 text-lg">Per-tooth shade improvement</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {new Date(earliest.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} →{' '}
        {new Date(latest.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
        <span className="text-olo font-medium">{improved} improved</span> ·{' '}
        <span className="text-destructive">{declined} slipped</span> ·{' '}
        avg <span className="font-semibold text-foreground">{avgDelta > 0 ? '+' : ''}{avgDelta.toFixed(1)}</span> pts
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {teeth.map((t, i) => {
          const old = oldTeeth[t.tooth_id];
          const delta = Math.round((t.whiteness_score || 0) - (old.whiteness_score || 0));
          const c = tier(delta);
          const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
          return (
            <div key={i} className={`p-3 rounded-2xl border ${c.ring} bg-muted/20`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">{t.tooth_id}</span>
                <span className="text-[9px] uppercase text-muted-foreground">{t.tooth_type}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">Now</p>
                  <p className="font-heading font-700 text-lg text-olo leading-tight">{Math.round(t.whiteness_score || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground leading-none">Was</p>
                  <p className="text-sm text-muted-foreground leading-tight">{Math.round(old.whiteness_score || 0)}</p>
                </div>
              </div>
              <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${c.text}`}>
                <Icon className="w-3.5 h-3.5" />
                {delta > 0 ? '+' : ''}{delta}
                <span className="text-[10px] font-normal text-muted-foreground ml-auto">{c.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}