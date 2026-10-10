import { useRef, useState, useCallback, useEffect } from 'react';
import { TrendingUp, Award } from 'lucide-react';
import { useScanPhoto } from '@/hooks/use-scan-photo';
import { shadeDeltaSteps } from '@/lib/baseline';

// Post-scan Instant Delta — an interactive Before/After split slider comparing
// the user's Day-1 baseline scan against their latest scan, with the shade
// delta ("A3.5 → A2, +2 shades brighter") and a +XP award.
//
// This is the "meet them in their moment" reveal right after a scan completes.
// Uses the real scan photos (not AI-whitened previews) so the comparison is
// honest and clinical.

export default function InstantDelta({ baselineScan, currentScan }) {
  const { src: baselineSrc } = useScanPhoto(baselineScan?.image_url);
  const { src: currentSrc } = useScanPhoto(currentScan?.image_url);
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const dragging = useRef(false);

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

  // Shade delta: shadeDeltaSteps(current, baseline) = shadeIndex(baseline) - shadeIndex(current).
  // Positive = current is lighter than baseline = improvement.
  const baseShade = baselineScan?.shade_code || baselineScan?.shade;
  const curShade = currentScan?.shade_code || currentScan?.shade;
  const delta = baseShade && curShade ? shadeDeltaSteps(curShade, baseShade) : null;
  const brighter = delta != null && delta > 0;
  const darker = delta != null && delta < 0;
  const scoreDelta = (currentScan?.score ?? null) != null && (baselineScan?.score ?? null) != null
    ? Math.round((currentScan.score - baselineScan.score) * 10) / 10
    : null;

  const hasBoth = !!(baselineSrc && currentSrc);
  if (!hasBoth && !baselineSrc && !currentSrc) return null;

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-olo" />
        <h3 className="font-heading font-600 text-lg">Your smile evolution</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Day 1 baseline vs today — drag to compare your real progress.
      </p>

      {hasBoth ? (
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
          {/* Current (today) — full width base */}
          <img src={currentSrc} alt="Today" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          {/* Baseline (Day 1) — clipped to left portion */}
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
            <img
              src={baselineSrc}
              alt="Day 1 baseline"
              className="absolute inset-0 h-full object-cover"
              style={{ width: containerWidth || '100%', maxWidth: 'none' }}
              draggable={false}
            />
          </div>

          {/* Labels */}
          <div className="absolute top-3 left-3 glass px-3 py-1.5 rounded-lg z-10">
            <span className="text-xs font-semibold text-white">Day 1</span>
          </div>
          <div className="absolute top-3 right-3 glass px-3 py-1.5 rounded-lg z-10">
            <span className="text-xs font-semibold text-olo">Today</span>
          </div>

          {/* Split handle */}
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
      ) : (
        <div className="aspect-[4/3] rounded-2xl bg-muted/30 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading photos…</p>
        </div>
      )}

      {/* Delta metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-muted/40 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Day 1</p>
          <p className="mt-1 text-xl font-heading font-700 text-muted-foreground tabular-nums">{baseShade || '—'}</p>
        </div>
        <div className={`p-4 rounded-2xl text-center ${brighter ? 'bg-olo/10' : 'bg-muted/40'}`}>
          <p className={`text-xs uppercase tracking-wider flex items-center justify-center gap-1 ${brighter ? 'text-olo' : 'text-muted-foreground'}`}>
            {brighter && <TrendingUp className="w-3 h-3" />} Today
          </p>
          <p className={`mt-1 text-xl font-heading font-700 tabular-nums ${brighter ? 'text-olo' : 'text-foreground'}`}>{curShade || '—'}</p>
        </div>
      </div>

      {/* Delta headline + XP */}
      {delta != null && delta !== 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-olo/5 border border-olo/15">
          <div className="flex items-center gap-2.5">
            <Award className={`w-5 h-5 ${brighter ? 'text-olo' : 'text-warning'}`} />
            <div>
              <p className="text-sm font-semibold">
                {brighter
                  ? `${Math.abs(delta)} shade${Math.abs(delta) !== 1 ? 's' : ''} brighter`
                  : `${Math.abs(delta)} shade${Math.abs(delta) !== 1 ? 's' : ''} darker`}
              </p>
              {scoreDelta != null && (
                <p className="text-xs text-muted-foreground">
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta} luminance index
                </p>
              )}
            </div>
          </div>
          {brighter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-olo text-white text-xs font-semibold">
              +{Math.min(250, Math.abs(delta) * 50 + Math.max(0, scoreDelta) * 5)} XP
            </span>
          )}
        </div>
      )}
      {delta === 0 && (
        <div className="mt-3 p-3.5 rounded-2xl bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">No shade change yet — consistency compounds. Keep scanning.</p>
        </div>
      )}
    </div>
  );
}