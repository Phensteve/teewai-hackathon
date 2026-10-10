import { useRef, useState, useCallback, useEffect } from 'react';
import { TrendingUp, Wand2, Loader2 } from 'lucide-react';
import { processImageToDataURL } from '@/lib/teewaiVision';

// Before/after whitening preview.
// A deterministic canvas pass (teewaiVision HSV whitening) segments the teeth,
// desaturates the yellow discoloration channel, and lifts enamel brightness
// toward a natural white. It's consistent and natural — the previous AI
// image-swap produced unreliable, often horrible results, so it was removed.
export default function BeforeAfterSlider({
  imageUrl,
  currentScore,
  potentialScore,
  potentialShade,
  intensity,
}) {
  const [pos, setPos] = useState(50);
  const [afterUrl, setAfterUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setAfterUrl(null);
    const strength = Math.max(35, Math.min(90, intensity ?? 60));
    processImageToDataURL(imageUrl, strength)
      .then((url) => { if (active) { setAfterUrl(url); setLoading(false); } })
      .catch(() => { if (active) { setAfterUrl(imageUrl); setLoading(false); } });
    return () => { active = false; };
  }, [imageUrl, intensity]);

  // Track container width so the "before" image stays full-width inside the
  // clip div (reading clientWidth during render returns 0 on first paint).
  useEffect(() => {
    const update = () => setContainerWidth(containerRef.current?.clientWidth || 0);
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const updatePos = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  const onDown = (e) => { dragging.current = true; updatePos(e.touches ? e.touches[0].clientX : e.clientX); };
  const onMove = (e) => { if (!dragging.current) return; updatePos(e.touches ? e.touches[0].clientX : e.clientX); };
  const onUp = () => { dragging.current = false; };

  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Wand2 className="w-5 h-5 text-olo" />
        <h3 className="font-heading font-600 text-lg">Whitening potential preview</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
        <Wand2 className="w-3.5 h-3.5 text-olo" />
        {loading ? 'Preparing your whitening preview…' : 'Your smile with its brightest natural white — drag to compare.'}
      </p>

      <div
        ref={containerRef}
        className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-olo-deep cursor-ew-resize select-none touch-none"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
      >
        {/* After (whitened) — full width base */}
        <img
          src={afterUrl || imageUrl}
          alt="Whitened preview"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {/* Before (original) — clipped to left portion */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img
            src={imageUrl}
            alt="Original"
            className="absolute inset-0 h-full object-cover"
            style={{ width: containerWidth || '100%', maxWidth: 'none' }}
            draggable={false}
          />
        </div>

        {loading && (
          <div className="absolute inset-0 bg-olo-deep/60 flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="w-8 h-8 animate-spin text-olo" />
            <p className="text-sm font-medium">Preparing your whitened smile…</p>
          </div>
        )}

        <div className="absolute top-3 left-3 glass px-3 py-1.5 rounded-lg z-10">
          <span className="text-xs font-semibold text-white">Before</span>
        </div>
        <div className="absolute top-3 right-3 glass px-3 py-1.5 rounded-lg z-10">
          <span className="text-xs font-semibold text-olo">After</span>
        </div>

        {/* Soft gradient at the split edge for a natural transition */}
        <div
          className="absolute top-0 bottom-0 w-8 pointer-events-none"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)', background: 'linear-gradient(90deg, rgba(0,0,0,0.15), transparent, rgba(0,0,0,0.15))' }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_16px_var(--olo-glow)] pointer-events-none z-10"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-xl flex items-center justify-center">
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-olo rounded-full" />
              <div className="w-1 h-4 bg-olo rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
        <Wand2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
          This preview shows your smile with a brighter, whiter shade and any visible lip concerns highlighted. It's an illustration of your potential, not a promise — real results depend on your habits, enamel, and treatment.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-muted/40 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current</p>
          <p className="mt-1 text-2xl font-heading font-700 text-muted-foreground">{currentScore ?? '—'}</p>
        </div>
        <div className="p-4 rounded-2xl bg-olo/10 text-center">
          <p className="text-xs text-olo uppercase tracking-wider flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" /> Potential
          </p>
          <p className="mt-1 text-2xl font-heading font-700 text-olo">{potentialScore ?? '—'}</p>
          {potentialShade && <p className="text-xs text-muted-foreground mt-0.5">{potentialShade}</p>}
        </div>
      </div>
    </div>
  );
}