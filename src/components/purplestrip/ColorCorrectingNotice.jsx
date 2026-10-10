import { Eye, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

// Results screen notice: shown when a scan is flagged as having a color
// correcting product (purple strip or serum). Honest tone, never shaming.
// The shade readings are optically distorted and do not reflect the true
// shade. Recommends re-scanning without it.
export default function ColorCorrectingNotice({ scan }) {
  if (!scan?.color_correcting_product_detected) return null;

  const confidence = scan.violet_cast_confidence;
  const confidenceLabel = confidence >= 0.75 ? 'high confidence' : confidence >= 0.5 ? 'moderate confidence' : 'detected';

  return (
    <div className="mb-4 p-4 rounded-2xl border border-violet-400/40 bg-violet-50/80 dark:bg-violet-950/30">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
          <Eye className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-heading font-600 text-violet-900 dark:text-violet-200">
            We detected a color correcting product in this scan
          </p>
          <p className="text-xs text-violet-700/80 dark:text-violet-300/70 mt-1 leading-relaxed">
            A purple strip or serum leaves a violet film on your teeth. It cancels
            yellow undertones optically, so the shade reading here is distorted and
            does not reflect your true shade. This scan is excluded from your
            baseline and progress tracking to keep your data honest.
          </p>
          <p className="text-[10px] text-violet-600/60 dark:text-violet-400/50 mt-1.5">
            Detection {confidenceLabel}
          </p>
          <Link
            to="/scan"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Re-scan without the product
          </Link>
        </div>
      </div>
    </div>
  );
}