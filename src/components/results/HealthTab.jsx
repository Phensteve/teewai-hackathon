import { useState } from 'react';
import { Shield, Stethoscope, Brush, Info, X } from 'lucide-react';
import BrushingAdvice from '@/components/BrushingAdvice';
import { severityColor, severityLabel, issueSeverity } from '@/lib/unrufldteeth';

const CLINICAL_INFO = {
  gingival: 'The Gingival Index (Löe & Silness) scores gum inflammation on a 0–3 scale per tooth based on bleeding and tissue changes. 0 = healthy gums, 3 = severe inflammation. Higher scores mean more active gum inflammation.',
  plaque: 'The Silness-Löe Plaque Index scores the amount of plaque on each tooth surface 0–3. 0 = no plaque, 3 = abundant visible plaque. It measures how much soft bacterial film is sitting on your teeth.',
  bewe: 'BEWE (Basic Erosive Wear Examination) screens for acid erosion of tooth enamel. Each sextant of the mouth is scored 0–3 and summed (max 18). Higher scores mean more enamel lost to acid wear.',
  periodontal: 'An estimated risk of gum disease (periodontitis) based on gum inflammation, plaque and recession signals from your scan. Higher risk means a greater likelihood of gum disease developing — your dentist confirms with probing.',
  calculus: 'Calculus (tartar) is plaque that has hardened onto the teeth. Once hardened it cannot be removed by brushing and requires a professional cleaning. "Present" means tartar deposits were visible in your scan.',
  white_spots: 'White-spot lesions are areas of early enamel demineralization — the first visible sign of breakdown, often a precursor to cavities. Detecting them early means they can often be reversed with fluoride and diet changes.',
  dmf: 'DMF surfaces counts tooth surfaces that are Decayed, Missing or Filled — a classic measure of your caries (cavity) history. D = current decay, M = missing, F = filled/restored.',
};

export default function HealthTab({ scan, applianceType, gumSev, plaqueSev, enamelSev }) {
  const [infoOpen, setInfoOpen] = useState(null);
  return (
    <>
      {/* Dental health detail */}
      <div className="mb-4 p-5 sm:p-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-success" />
          <h2 className="font-heading font-600 text-xl">Dental health breakdown</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
          {[
            { label: 'Gum health', value: scan.gum_health, sev: gumSev, cap: true },
            { label: 'Plaque level', value: scan.plaque_level, sev: plaqueSev, cap: true },
            { label: 'Enamel', value: scan.enamel_condition, sev: enamelSev, cap: false },
          ].map((t) => {
            const color = severityColor(t.sev);
            return (
              <div key={t.label} className="p-4 rounded-2xl bg-gradient-to-b from-muted/60 to-muted/20 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.label}</p>
                <p className={`mt-1 font-heading font-700 text-sm leading-snug ${t.cap ? 'capitalize' : ''}`} style={{ color }}>{t.value || '—'}</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, Math.min(100, t.sev))}%`, backgroundColor: color }} />
                </div>
                <p className="text-[10px] mt-1" style={{ color }}>{severityLabel(t.sev)}</p>
              </div>
            );
          })}
        </div>
        {scan.dental_health_issues?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Issues to address</p>
            <div className="flex flex-wrap gap-2">
              {scan.dental_health_issues.map((issue, i) => {
                const color = severityColor(issueSeverity(issue));
                return (
                  <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ color, backgroundColor: `${color}1f` }}>
                    {issue}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Clinical measures (research-validated indices) */}
      {(scan.plaque_index != null || scan.gingival_index != null || scan.bewe_score != null) && (
        <div className="mb-4 p-5 sm:p-6 rounded-3xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="w-5 h-5 text-success" />
            <h2 className="font-heading font-600 text-xl">Clinical measures</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {scan.gingival_index != null && (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-success/5 to-muted/20 border border-success/10">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Gingival index</p>
                  <button onClick={() => setInfoOpen({ label: 'Gingival index', info: CLINICAL_INFO.gingival })} aria-label="What is Gingival index" className="-mr-1 p-1 rounded-full hover:bg-foreground/10 transition-colors"><Info className="w-3.5 h-3.5 text-muted-foreground/70" /></button>
                </div>
                <p className="mt-1 font-heading font-700 text-lg text-success">{scan.gingival_index}/3</p>
                {scan.gingival_index_grade && <p className="text-xs text-muted-foreground capitalize">{scan.gingival_index_grade}</p>}
              </div>
            )}
            {scan.plaque_index != null && (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-success/5 to-muted/20 border border-success/10">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Plaque index</p>
                  <button onClick={() => setInfoOpen({ label: 'Plaque index', info: CLINICAL_INFO.plaque })} aria-label="What is Plaque index" className="-mr-1 p-1 rounded-full hover:bg-foreground/10 transition-colors"><Info className="w-3.5 h-3.5 text-muted-foreground/70" /></button>
                </div>
                <p className="mt-1 font-heading font-700 text-lg text-success">{scan.plaque_index}/3 <span className="text-xs text-muted-foreground font-normal">Silness-Löe</span></p>
              </div>
            )}
            {scan.bewe_score != null && (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-success/5 to-muted/20 border border-success/10">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">BEWE erosion</p>
                  <button onClick={() => setInfoOpen({ label: 'BEWE erosion', info: CLINICAL_INFO.bewe })} aria-label="What is BEWE erosion" className="-mr-1 p-1 rounded-full hover:bg-foreground/10 transition-colors"><Info className="w-3.5 h-3.5 text-muted-foreground/70" /></button>
                </div>
                <p className="mt-1 font-heading font-700 text-lg text-success">{scan.bewe_score}/18</p>
                {scan.erosion_risk && <p className="text-xs text-muted-foreground capitalize">{scan.erosion_risk} risk</p>}
              </div>
            )}
            {scan.periodontal_risk && (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-success/5 to-muted/20 border border-success/10">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Periodontal risk</p>
                  <button onClick={() => setInfoOpen({ label: 'Periodontal risk', info: CLINICAL_INFO.periodontal })} aria-label="What is Periodontal risk" className="-mr-1 p-1 rounded-full hover:bg-foreground/10 transition-colors"><Info className="w-3.5 h-3.5 text-muted-foreground/70" /></button>
                </div>
                <p className="mt-1 font-heading font-700 text-lg capitalize text-success">{scan.periodontal_risk}</p>
              </div>
            )}
            {scan.calculus_present != null && (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-success/5 to-muted/20 border border-success/10">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Calculus / tartar</p>
                  <button onClick={() => setInfoOpen({ label: 'Calculus / tartar', info: CLINICAL_INFO.calculus })} aria-label="What is Calculus / tartar" className="-mr-1 p-1 rounded-full hover:bg-foreground/10 transition-colors"><Info className="w-3.5 h-3.5 text-muted-foreground/70" /></button>
                </div>
                <p className="mt-1 font-heading font-700 text-lg text-success">{scan.calculus_present ? 'Present' : 'None seen'}</p>
              </div>
            )}
            {scan.demineralization_white_spots != null && (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-success/5 to-muted/20 border border-success/10">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">White-spot lesions</p>
                  <button onClick={() => setInfoOpen({ label: 'White-spot lesions', info: CLINICAL_INFO.white_spots })} aria-label="What are White-spot lesions" className="-mr-1 p-1 rounded-full hover:bg-foreground/10 transition-colors"><Info className="w-3.5 h-3.5 text-muted-foreground/70" /></button>
                </div>
                <p className="mt-1 font-heading font-700 text-lg text-success">{scan.demineralization_white_spots ? 'Detected' : 'None seen'}</p>
              </div>
            )}
            {(scan.dmf_decayed_surfaces != null || scan.dmf_filled_surfaces != null) && (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-success/5 to-muted/20 border border-success/10">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">DMF surfaces</p>
                  <button onClick={() => setInfoOpen({ label: 'DMF surfaces', info: CLINICAL_INFO.dmf })} aria-label="What are DMF surfaces" className="-mr-1 p-1 rounded-full hover:bg-foreground/10 transition-colors"><Info className="w-3.5 h-3.5 text-muted-foreground/70" /></button>
                </div>
                <p className="mt-1 font-heading font-700 text-lg text-success">
                  {(scan.dmf_decayed_surfaces || 0) + (scan.dmf_missing_surfaces || 0) + (scan.dmf_filled_surfaces || 0)}
                  <span className="text-xs text-muted-foreground font-normal"> D{scan.dmf_decayed_surfaces || 0}/M{scan.dmf_missing_surfaces || 0}/F{scan.dmf_filled_surfaces || 0}</span>
                </p>
              </div>
            )}
            {scan.restorations_detected?.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-success/5 to-muted/20 border border-success/10 col-span-2 sm:col-span-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Restorations detected</p>
                <div className="flex flex-wrap gap-2">
                  {scan.restorations_detected.map((r, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium">{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Indexed against validated dental scales (Silness &amp; Löe Plaque Index, Löe &amp; Silness Gingival Index, Basic Erosive Wear Examination). teewai screens from a photo — your dentist confirms with probing.
          </p>
        </div>
      )}

      {infoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
          onClick={() => setInfoOpen(null)}
        >
          <div
            className="relative w-full max-w-sm p-5 rounded-2xl bg-card border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setInfoOpen(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <Info className="w-4 h-4 text-success" />
              </span>
              <h3 className="font-heading font-600 text-sm pr-6">{infoOpen.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{infoOpen.info}</p>
          </div>
        </div>
      )}

      {/* Brushing advice — tailored to braces / retainer / general */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Brush className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-xl">Brushing advice</h2>
        </div>
        <BrushingAdvice applianceType={applianceType} />
      </div>

      {/* Professional procedures to discuss with a dentist */}
      {scan.procedures?.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="w-5 h-5 text-olo" />
            <h2 className="font-heading font-600 text-xl">Procedures to discuss with a dentist</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {scan.procedures.map((p, i) => (
              <div key={i} className="p-4 rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <p className="font-heading font-600 text-sm">{p.name}</p>
                  {p.category && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-olo/10 text-olo flex-shrink-0">{p.category}</span>}
                </div>
                {p.reason && <p className="text-xs text-muted-foreground">{p.reason}</p>}
                {p.timing && <p className="text-[11px] text-muted-foreground mt-1">⏱ {p.timing}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}