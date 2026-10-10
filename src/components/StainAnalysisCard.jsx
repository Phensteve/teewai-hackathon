import { FlaskConical, ShieldCheck, Droplet } from 'lucide-react';
import { buildStainBreakdown, STAIN_CHEMISTRY } from '@/lib/stainAnalysis';

// Professional stain-analysis card for the Results page. Renders the
// chromogen / tannin / acid / intrinsic / biofilm breakdown teewai detected on
// the enamel — using the stored `stain_breakdown` when available, else rebuilt
// on the fly from `stain_types` so older scans still render.

const SEVERITY_TONE = {
  mild: 'bg-success/10 text-success',
  moderate: 'bg-warning/10 text-warning',
  heavy: 'bg-danger/10 text-danger',
};

const CHEM_TONE = {
  rose: 'bg-danger/10 text-danger',
  amber: 'bg-warning/10 text-warning',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
};

export default function StainAnalysisCard({ scan }) {
  const items = Array.isArray(scan?.stain_breakdown) && scan.stain_breakdown.length
    ? scan.stain_breakdown
    : buildStainBreakdown(scan || {});

  return (
    <div className="mb-5 p-5 rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical className="w-4 h-4 text-danger" />
        <h3 className="font-heading font-600 text-base">Stain analysis</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        The chromogens, tannins and other elements we detected on your enamel — and what to do about each.
      </p>

      {items.length === 0 ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-success/5 border border-success/20">
          <ShieldCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-success">No staining elements detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your enamel looks clear of chromogens, tannins and biofilm staining. Keep up your routine.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => {
            const sev = SEVERITY_TONE[it.severity] || SEVERITY_TONE.moderate;
            return (
              <div key={i} className="p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{it.name}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${sev}`}>{it.severity}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {it.chemistry.map((c) => {
                    const chem = STAIN_CHEMISTRY[c] || { label: c, blurb: '', tone: 'slate' };
                    return (
                      <span key={c} title={chem.blurb}
                        className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${CHEM_TONE[chem.tone] || CHEM_TONE.slate}`}>
                        <Droplet className="w-2.5 h-2.5" /> {chem.label}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{it.explain}</p>
                {it.sources && <p className="text-[11px] text-muted-foreground mt-1">Sources: {it.sources}</p>}
                {it.mitigate && <p className="text-[11px] text-olo mt-1.5">Tip: {it.mitigate}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}