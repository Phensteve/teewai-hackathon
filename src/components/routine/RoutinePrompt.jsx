import { useState } from 'react';
import { ClipboardList, RefreshCw, Check, Loader2, X } from 'lucide-react';

// Post-scan prompt: after viewing scan results, the user can either generate
// a fresh routine from the new scan or keep their existing one. Shown when
// the scan has actionable findings (new stains, health changes) and the user
// has an existing routine OR when they have no routine yet.
//
// Props:
//   scan, routine, onGenerate (async), onDismiss
export default function RoutinePrompt({ scan, routine, onGenerate, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Only show if the scan has findings worth acting on
  const stains = Array.isArray(scan?.stain_types) ? scan.stain_types : (Array.isArray(scan?.stains_detected) ? scan.stains_detected : []);
  const hasFindings = stains.length > 0 || scan?.gum_health === 'poor' || scan?.gum_health === 'fair' || scan?.plaque_level === 'moderate' || scan?.plaque_level === 'heavy';
  if (!hasFindings && routine) return null;

  const handleGenerate = async () => {
    setBusy(true);
    try { await onGenerate(); setDone(true); } catch {}
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="mb-4 p-4 rounded-2xl border border-success/20 bg-success-soft/40 flex items-center gap-3 animate-fade-up">
        <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-success" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-success">Routine updated</p>
          <p className="text-xs text-muted-foreground">Your new routine is ready on your dashboard.</p>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-muted">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 p-4 rounded-2xl border border-olo/20 bg-gradient-to-br from-olo/8 to-card animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-olo/15 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-4.5 h-4.5 text-olo" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-heading font-600">
            {routine ? 'Update your routine from this scan?' : 'Build your personalized routine?'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {routine
              ? `Your scan found ${stains.length ? stains.length + ' new staining factor' + (stains.length > 1 ? 's' : '') : 'changes'}. Generate a fresh routine tailored to these findings, or keep your current one.`
              : 'Get a daily care plan built from your scan — brushing, flossing, dietary guidance, and stain mitigation, with locked steps that protect against your detected issues.'}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleGenerate}
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-olo text-white text-sm font-semibold px-3.5 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {routine ? 'Generate new routine' : 'Build my routine'}
            </button>
            {routine && (
              <button
                onClick={onDismiss}
                disabled={busy}
                className="inline-flex items-center gap-1.5 border border-border text-muted-foreground text-sm font-medium px-3.5 py-2 rounded-xl hover:text-foreground hover:border-olo/30 transition-colors"
              >
                Keep current
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}