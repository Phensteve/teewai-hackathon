import { useState } from 'react';
import { FlaskConical, ChevronDown, Wind, Clock, Layers, AlertTriangle, TrendingDown, Activity, Info, X } from 'lucide-react';

// Displays the unrufldteeth™ engine insights — the "dormant" clinical features
// that are now computed on every scan. Collapsible so it's available to curious
// users without overwhelming the primary results.
export default function EngineInsights({ scan }) {
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(null);
  const insights = scan?.engine_insights;
  if (!insights) return null;

  const items = [];

  if (insights.vita_3d_master?.tab) {
    items.push({
      icon: Layers,
      label: 'VITA 3D-MASTER',
      value: insights.vita_3d_master.tab,
      detail: `Value ${insights.vita_3d_master.value} · Hue ${insights.vita_3d_master.hue} · Chroma ${insights.vita_3d_master.chroma}`,
      info: 'A professional shade-matching system dentists use to precisely categorize tooth color by three dimensions: value (how light/dark), hue (warm vs cool tone), and chroma (color intensity). It goes beyond a single shade label to fully describe your tooth color.',
      tint: 'olo',
    });
  }

  if (typeof insights.halitosis_risk === 'number') {
    const risk = insights.halitosis_risk;
    const level = risk >= 60 ? 'Elevated' : risk >= 30 ? 'Moderate' : 'Low';
    items.push({
      icon: Wind,
      label: 'Breath freshness',
      value: level,
      detail: `${risk}/100 — based on plaque, tartar and tongue indicators`,
      info: 'An estimated likelihood of breath odor, inferred from plaque buildup, tartar and tongue-coating signals visible in your scan. It is a proxy estimate, not a direct breath measurement.',
      tint: risk >= 60 ? 'amber' : 'emerald',
    });
  }

  if (typeof insights.dental_age === 'number') {
    items.push({
      icon: Clock,
      label: 'Dental age estimate',
      value: `${insights.dental_age} yrs`,
      detail: 'Approximate — from shade, wear and gum recession signals',
      info: 'An estimate of how "old" your teeth appear based on shade yellowing, enamel wear and gum recession — not your actual age. It reflects accumulated wear and staining over time.',
      tint: 'olo',
    });
  }

  if (typeof insights.whitening_responsiveness === 'number') {
    const r = insights.whitening_responsiveness;
    const level = r >= 70 ? 'High' : r >= 45 ? 'Moderate' : 'Limited';
    items.push({
      icon: TrendingDown,
      label: 'Whitening responsiveness',
      value: level,
      detail: `${r}/100 — how well your teeth are likely to respond to whitening`,
      info: 'How likely your teeth are to lighten with whitening treatment, based on your enamel condition and current shade. Higher means a better expected response; lower may mean slower or more limited results.',
      tint: r >= 70 ? 'emerald' : 'amber',
    });
  }

  if (insights.shade_aging) {
    const sa = insights.shade_aging;
    items.push({
      icon: Activity,
      label: 'Shade aging forecast',
      value: `−${Math.max(0, (scan?.score || 0) - (sa.weeks_24 || 0))} pts / 6 mo`,
      detail: `Without treatment: ${sa.weeks_4} → ${sa.weeks_12} → ${sa.weeks_24} (4w · 12w · 24w)`,
      info: 'A projection of how your tooth shade may naturally darken over the next 6 months if you do nothing — no whitening, no habit changes. The three numbers show predicted whiteness at 4, 12 and 24 weeks.',
      tint: 'olo',
    });
  }

  if (insights.shade_relapse) {
    const sr = insights.shade_relapse;
    items.push({
      icon: TrendingDown,
      label: 'Whitening relapse forecast',
      value: `−${Math.max(0, (scan?.score || 0) - (sr.weeks_8 || 0))} pts / 8 wks`,
      detail: `Post-whitening rebound: ${sr.weeks_2} → ${sr.weeks_4} → ${sr.weeks_8} (2w · 4w · 8w)`,
      info: 'A projection of how much whiteness you may lose back in the weeks after a whitening treatment, as teeth naturally settle. The three numbers show predicted whiteness at 2, 4 and 8 weeks post-treatment.',
      tint: 'amber',
    });
  }

  if (insights.cambra_risk) {
    const risk = insights.cambra_risk;
    const colors = { high: 'red', moderate: 'amber', low: 'emerald' };
    items.push({
      icon: AlertTriangle,
      label: 'Caries risk (CAMBRA)',
      value: risk.charAt(0).toUpperCase() + risk.slice(1),
      detail: 'Risk of new decay based on current decay, white spots and plaque',
      info: 'CAMBRA (Caries Management by Risk Assessment) is a dental framework that estimates your risk of developing new cavities, based on signs of current decay, white-spot lesions and plaque. It is a risk indicator, not a diagnosis.',
      tint: colors[risk] || 'olo',
    });
  }

  if (typeof insights.tooth_wear_index === 'number' && insights.tooth_wear_index > 0) {
    const twi = insights.tooth_wear_index;
    const labels = ['No wear', 'Enamel only', 'Dentin <1/3', 'Dentin 1/3–2/3', 'Dentin >2/3'];
    items.push({
      icon: Activity,
      label: 'Tooth wear index (TWI)',
      value: `Grade ${twi}`,
      detail: labels[twi] || 'Unknown',
      info: 'The Tooth Wear Index grades how much your enamel and dentin have worn down from grinding, acid erosion or aging. Grade 0 is no wear; higher grades mean more exposed dentin and greater wear.',
      tint: twi >= 3 ? 'red' : 'amber',
    });
  }

  if (insights.cast_spectrum?.label) {
    items.push({
      icon: FlaskConical,
      label: 'Caries spectrum (CAST)',
      value: insights.cast_spectrum.label,
      detail: `${insights.cast_spectrum.lesion_count} lesion(s) detected · max severity code ${insights.cast_spectrum.max_code}`,
      info: 'CAST (Caries Assessment Spectrum and Treatment) is a dental index that scores each detected lesion from 0 (sound) to 9 (lost tooth). The max code shows the most severe lesion found in your scan.',
      tint: insights.cast_spectrum.max_code >= 5 ? 'red' : 'amber',
    });
  }

  if (!items.length) return null;

  const tintMap = {
    olo: 'border-olo/20 bg-olo/5 text-olo',
    emerald: 'border-success/20 bg-success/5 text-success',
    amber: 'border-warning/20 bg-warning/5 text-warning',
    red: 'border-danger/20 bg-danger/5 text-danger',
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full p-3 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-olo/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-olo" />
          </span>
          <span className="flex flex-col text-left">
            <span className="text-sm font-semibold">Engine insights</span>
            <span className="text-xs text-muted-foreground">{items.length} advanced metrics from unrufldteeth™</span>
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 max-h-[50vh] overflow-y-auto no-scrollbar pr-0.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-fade-up">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className={`p-3 rounded-xl border ${tintMap[item.tint] || tintMap.olo}`}>
                  <div className="flex items-start gap-2.5">
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-wide opacity-70">{item.label}</p>
                        <button
                          onClick={() => setInfoOpen({ label: item.label, info: item.info })}
                          aria-label={`What is ${item.label}`}
                          className="flex-shrink-0 -mr-1 -mt-0.5 p-1 rounded-full hover:bg-foreground/10 transition-colors"
                        >
                          <Info className="w-3.5 h-3.5 opacity-60" />
                        </button>
                      </div>
                      <p className="text-sm font-bold leading-tight mt-0.5">{item.value}</p>
                      <p className="text-xs opacity-60 mt-1 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
              <span className="w-8 h-8 rounded-lg bg-olo/10 flex items-center justify-center">
                <Info className="w-4 h-4 text-olo" />
              </span>
              <h3 className="font-heading font-600 text-sm pr-6">{infoOpen.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{infoOpen.info}</p>
          </div>
        </div>
      )}
    </div>
  );
}