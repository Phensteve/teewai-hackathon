import { useState } from 'react';
import { X, Flag, Check } from 'lucide-react';
import { setBaseline, formatBaselineDate, isFlagged } from '@/lib/baseline';
import ScanImage from '@/components/ScanImage';
import Spinner from '@/components/Spinner';

// Scan picker modal: lets the user choose any past scan as their baseline.
export default function BaselinePicker({ scans, currentBaselineId, onPick, onClose }) {
  const [saving, setSaving] = useState(null);

  const handlePick = async (scan) => {
    setSaving(scan.id);
    try {
      await setBaseline(scan.id, scan.created_date);
      onPick(scan);
    } catch {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="relative w-full max-w-md max-h-[80vh] overflow-y-auto p-5 rounded-3xl bg-card border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Flag className="w-5 h-5 text-olo" />
          <h3 className="font-heading font-700 text-lg">Choose your baseline</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Your progress is measured from this scan. Pick any past scan as your reference point.
        </p>
        <div className="space-y-2">
          {scans.filter((s) => !isFlagged(s)).map((s) => {
            const isCurrent = s.id === currentBaselineId;
            return (
              <button
                key={s.id}
                onClick={() => !isCurrent && handlePick(s)}
                disabled={isCurrent || saving !== null}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors ${isCurrent ? 'border-olo bg-olo/5' : 'border-border hover:border-olo/40 hover:bg-olo/5'}`}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-olo-deep flex-shrink-0">
                  {s.image_url ? <ScanImage url={s.image_url} alt="scan" className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {new Date(s.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted-foreground">Shade {s.shade || '—'} · {s.score ?? '—'} whiteness</p>
                </div>
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-olo">
                    <Check className="w-3.5 h-3.5" /> Current
                  </span>
                ) : saving === s.id ? (
                  <Spinner size={20} />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}