import { useState, useRef, useEffect } from 'react';
import { Type, Check } from 'lucide-react';
import { useTextZoom, setTextZoom, ZOOM_LEVELS } from '@/hooks/use-text-zoom';

export default function TextZoomControl({ dropUp = false, showLabel = false }) {
  const level = useTextZoom();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('touchstart', onClick);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('touchstart', onClick);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Text size — currently ${level}%. Activate to open size options.`}
        title={`Text size — ${level}%`}
        className="h-9 min-w-[36px] rounded-xl flex items-center justify-center gap-1 px-1.5 text-muted-foreground hover:text-olo hover:bg-olo/10 transition-colors"
      >
        <Type className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        {showLabel && <span className="text-xs font-medium tabular-nums" aria-hidden="true">{level}%</span>}
      </button>
      {open && (
        <div
          className={`absolute right-0 ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'} w-36 rounded-2xl border border-border bg-popover shadow-xl z-[60] p-1.5 animate-fade-up`}
        >
          <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Text size</p>
          {ZOOM_LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => { setTextZoom(l); setOpen(false); }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-colors ${
                l === level ? 'text-olo bg-olo/10 font-semibold' : 'text-foreground hover:bg-muted'
              }`}
            >
              <span className="tabular-nums">{l}%</span>
              {l === level && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}