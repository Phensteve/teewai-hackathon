import { Link } from 'react-router-dom';
import { Zap, ArrowRight, Sparkles, TrendingUp, Camera, ShieldCheck, HeartPulse, Sun, Info, Check } from 'lucide-react';
import { whitenessColor, healthLevelFromScore, getHealthLabel } from '@/lib/unrufldteeth';
import { VITA_ATLAS } from '@/lib/teewaiColorimetry';

// Shade label lookup from the VITA atlas — maps a code like "A1" to a
// human-readable description ("Excellent", "Good", etc.) using the
// whiteness score's health level as a proxy.
const shadeLabel = (code, whiteness) => {
  const level = healthLevelFromScore(whiteness);
  return getHealthLabel(level.key);
};

export default function FreeScanResult({ result, onRetake }) {
  if (!result) return null;
  const { whiteness, shade, colorimetric, brightness, yellowIndex, isNaturalTeeth, photoUrl, whiteBalanced, castDelta, gumHealth, confidence, vitaAnchored } = result;
  const scoreColor = whitenessColor(whiteness);
  const level = healthLevelFromScore(whiteness);
  const accuracy = colorimetric?.accuracy || 'fair';

  const accuracyLabel = {
    high: 'Very high',
    good: 'High',
    fair: 'Moderate',
    low: 'Low',
  }[accuracy] || 'Moderate';

  // Capture-quality confidence from the teeth-presence gate. Below 0.50 we
  // show a "moderate confidence" note so the user knows the reading is an
  // estimate, not a precise measurement.
  const confidenceLabel = confidence >= 0.70 ? 'High' : confidence >= 0.50 ? 'Moderate' : 'Low';
  const confidenceColor = confidence >= 0.70 ? '#16a34a' : confidence >= 0.50 ? '#f59e0b' : '#dc2626';

  // Gum health derived values
  const GUM_META = {
    excellent: { color: '#0d9f8e', label: 'Excellent', hint: 'Gums appear healthy and pink. Keep up your current routine.' },
    good: { color: '#65a30d', label: 'Good', hint: 'Gums look generally healthy. Maintain regular brushing and flossing.' },
    fair: { color: '#f59e0b', label: 'Fair', hint: 'Some gum redness detected. Focus on gentle brushing along the gum line and flossing daily.' },
    poor: { color: '#dc2626', label: 'Needs attention', hint: 'Noticeable gum inflammation. We recommend visiting a dentist for a professional assessment.' },
  };
  const gumLevel = gumHealth?.level || 'good';
  const gumMeta = GUM_META[gumLevel] || GUM_META.good;
  const gumColor = gumMeta.color;
  const gumLabel = gumMeta.label;
  const gumHint = gumMeta.hint;

  return (
    <div className="animate-fade-up">
      {/* Instant result card */}
      <div className="relative rounded-3xl border border-border bg-card frost-edge p-6 sm:p-8 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5" style={{ background: `linear-gradient(to right, ${scoreColor}, hsl(var(--olo)))` }} />

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-olo bg-olo/10 px-2.5 py-1 rounded-full">
            <Zap className="w-3.5 h-3.5" /> Instant result
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
            <Sun className="w-3 h-3" /> Lighting normalized
          </span>
          <span className="text-xs text-muted-foreground">No signup needed</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
          {/* Photo preview */}
          {photoUrl && (
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-border flex-shrink-0 bg-muted">
              <img src={photoUrl} alt="Your teeth" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Score circle */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center border-4"
              style={{ borderColor: scoreColor, boxShadow: `0 0 30px -8px ${scoreColor}` }}
            >
              <div className="text-center">
                <span className="font-heading font-800 text-3xl sm:text-4xl tabular-nums" style={{ color: scoreColor }}>{whiteness}</span>
                <span className="block text-[10px] text-muted-foreground font-medium tracking-wider uppercase mt-0.5">Whiteness</span>
              </div>
            </div>
          </div>

          {/* Shade + health */}
          <div className="flex-1 text-center sm:text-left">
            <div className="mb-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">VITA Shade</p>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="font-heading font-800 text-2xl">{shade}</span>
                <span className="text-sm font-medium" style={{ color: scoreColor }}>{shadeLabel(shade, whiteness)}</span>
              </div>
              {colorimetric && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Match confidence: {accuracyLabel} (ΔE {colorimetric.deltaE})
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${level.color}20`, color: level.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: level.color }} />
                {getHealthLabel(level.key)}
              </span>
              {isNaturalTeeth && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-olo" /> Natural hue
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-border">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Brightness</p>
            <p className="font-heading font-700 text-sm tabular-nums">{Math.round(brightness || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Yellow Index</p>
            <p className="font-heading font-700 text-sm tabular-nums">{yellowIndex != null ? Math.round(yellowIndex) : '—'}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Confidence</p>
            <p className="font-heading font-700 text-sm" style={{ color: confidenceColor }}>{confidenceLabel}</p>
          </div>
        </div>

        {/* Lighting-sensitivity note — explains that the score is an estimate
            and can shift with lighting, so a single scan is not a precise
            measurement. Avoids over-claiming precision. */}
        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
          <p className="leading-relaxed">
            This score is an illustrative estimate. Lighting and camera can shift the number a few points between scans, even of the same smile. For a precise reading, sign in to track your shade over time.
          </p>
        </div>
      </div>

      {/* Gum health indicator — broader clinical scope beyond whiteness */}
      {gumHealth && (
        <div className="mt-4 rounded-3xl border border-border bg-card frost-edge p-5">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${gumColor}20` }}
            >
              <HeartPulse className="w-6 h-6" style={{ color: gumColor }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gum Health</p>
                <span className="text-xs font-semibold" style={{ color: gumColor }}>{gumLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${gumHealth.score}%`, backgroundColor: gumColor }}
                  />
                </div>
                <span className="font-heading font-700 text-sm tabular-nums">{gumHealth.score}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{gumHint}</p>
            </div>
          </div>
        </div>
      )}

      {/* Baseline nudge — guests can't track progress */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <TrendingUp className="w-3.5 h-3.5 text-olo" />
        Create a free account to set your baseline and track your progress
      </div>

      {/* Upgrade CTA — the full AI analysis comes with a free account */}
      <div className="mt-4 rounded-3xl border border-olo/30 bg-olo/5 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-olo/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-olo" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-700 text-lg mb-1">Get your full AI analysis</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This instant scan uses teewai's colorimetry engine. <span className="text-foreground font-medium">Creating an account is free</span> — no payment required. You'll unlock the complete analysis:
            </p>
            <ul className="space-y-2 mb-5">
              {[
                'Full dental health score (cavities, gum health, enamel)',
                'Per-tooth analysis with stain breakdown',
                'Personalized whitening plan with timeline',
                'Product recommendations for your shade',
                'Progress tracking across scans',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-olo/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-olo" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-transform olo-glow w-full sm:w-auto justify-center"
            >
              Create free account <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-[11px] text-muted-foreground mt-2.5">Free to join · no card needed · 5 free scans included</p>
          </div>
        </div>
      </div>

      {/* Retake */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={onRetake}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors font-medium"
        >
          <Camera className="w-4 h-4" /> Scan again
        </button>
      </div>
    </div>
  );
}