import { useState } from 'react';
import { SCAN_REFERENCES } from '@/lib/scanReferences';
import { Eye, X, Maximize2 } from 'lucide-react';

// Shows the example photo for a capture angle so users can copy the pose.
// Tapping the thumbnail opens a full-size lightbox.
export default function ScanReference({ position = 'front' }) {
  const [open, setOpen] = useState(false);
  const ref = SCAN_REFERENCES[position];
  if (!ref) return null;

  return (
    <>
      <div className="mb-4 p-3 rounded-2xl border border-border bg-card flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="relative w-20 h-20 rounded-xl overflow-hidden border border-border flex-shrink-0 group"
          aria-label={`Enlarge ${ref.label} example photo`}
        >
          <img src={ref.url} alt={`Example ${ref.label} photo`} loading="lazy" className="w-full h-full object-cover" />
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-olo inline-flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Example — {ref.label}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ref.tip}</p>
          <button onClick={() => setOpen(true)} className="mt-1 text-[11px] font-medium text-olo underline hover:no-underline">
            Tap to enlarge
          </button>
        </div>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-lg w-full">
            <img src={ref.url} alt={`Example ${ref.label} photo`} className="w-full rounded-2xl" />
            <p className="mt-3 text-center text-sm text-white/80">{ref.label} — {ref.tip}</p>
          </div>
        </div>
      )}
    </>
  );
}