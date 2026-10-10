import { useEffect, useRef } from 'react';
import { Palette, ArrowRight, Info } from 'lucide-react';
import { BLEACHED, VITA_ORDER, norm, isBleached } from '@/lib/vitaShade';

export default function VitaShadeScale({
  currentShadeCode,
  targetShadeCode,
  currentShade,
  targetShade,
}) {
  const trackRef = useRef(null);
  const youRef = useRef(null);

  const cur = norm(currentShadeCode || currentShade);
  const tgt = norm(targetShadeCode || targetShade);
  const curNaturalIdx = VITA_ORDER.findIndex((v) => v.code === cur);
  const tgtNaturalIdx = VITA_ORDER.findIndex((v) => v.code === tgt);
  const curBleachedIdx = BLEACHED.findIndex((v) => v.code === cur);
  const tgtBleachedIdx = BLEACHED.findIndex((v) => v.code === tgt);
  const hasCur = curNaturalIdx >= 0 || curBleachedIdx >= 0;
  const hasTgt = tgtNaturalIdx >= 0 || tgtBleachedIdx >= 0;
  // Absolute index across bleached (0..2) + natural (3..18) for step comparison.
  const curAbs = curBleachedIdx >= 0 ? curBleachedIdx : curNaturalIdx >= 0 ? curNaturalIdx + BLEACHED.length : -1;
  const tgtAbs = tgtBleachedIdx >= 0 ? tgtBleachedIdx : tgtNaturalIdx >= 0 ? tgtNaturalIdx + BLEACHED.length : -1;
  const targetIsLighter = hasCur && hasTgt && tgtAbs < curAbs;
  const steps = hasCur && hasTgt ? Math.abs(curAbs - tgtAbs) : 0;
  const curIsBleached = isBleached(cur);
  const tgtIsBleached = isBleached(tgt);

  // Centre the "You" marker in view so the user's current shade is in focus.
  useEffect(() => {
    const track = trackRef.current;
    const you = youRef.current;
    if (track && you) {
      track.scrollLeft = you.offsetLeft - track.clientWidth / 2 + you.offsetWidth / 2;
    }
  }, [curAbs]);

  const renderSwatch = (v, absIdx, isBleachGroup) => {
    const isCur = absIdx === curAbs;
    const isTgt = absIdx === tgtAbs;
    return (
      <div
        key={v.code}
        ref={isCur ? youRef : null}
        className="flex flex-col items-center gap-1 flex-shrink-0"
        style={{ minWidth: isBleachGroup ? 22 : 24 }}
      >
        <div className="h-4 flex items-end justify-center">
          {isCur && isTgt && <span className="text-[9px] font-bold text-olo leading-none whitespace-nowrap">You + Target</span>}
          {isCur && !isTgt && <span className="text-[9px] font-bold text-foreground leading-none whitespace-nowrap">You</span>}
          {isTgt && !isCur && <span className="text-[9px] font-bold text-olo leading-none whitespace-nowrap">Target</span>}
        </div>
        <div
          className={`w-full aspect-square rounded-lg border-2 ${isBleachGroup ? 'border-dashed' : ''} ${
            isCur ? 'border-foreground ring-2 ring-foreground/20'
              : isTgt ? 'border-olo ring-2 ring-olo/30'
              : isBleachGroup ? 'border-olo/40' : 'border-black/10 dark:border-white/10'
          }`}
          style={{ backgroundColor: v.hex, minWidth: isBleachGroup ? 22 : 24 }}
        />
        <span className={`text-[9px] sm:text-[10px] font-medium leading-none ${isCur ? 'text-foreground' : isTgt ? 'text-olo' : 'text-muted-foreground'}`}>{v.code}</span>
      </div>
    );
  };

  return (
    <div className="mb-6 p-5 sm:p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="w-5 h-5 text-olo" />
        <h3 className="font-heading font-600 text-lg">Where you sit on the shade scale</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        The VITA guide is the international standard for tooth shade, ranked lightest to darkest. teewai grades your teeth against this ladder.
      </p>

      {/* The ladder — bleached group (dashed) then natural shades. Scrolls so
          the "You" marker stays centred in focus. */}
      <div ref={trackRef} className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-5 snap-x">
        <div className="flex gap-1.5 sm:gap-2 pr-2 sm:pr-3 mr-1 sm:mr-2 border-r-2 border-dashed border-olo/30">
          {BLEACHED.map((v, i) => renderSwatch(v, i, true))}
        </div>
        <div className="flex gap-1.5 sm:gap-2 flex-1">
          {VITA_ORDER.map((v, i) => renderSwatch(v, i + BLEACHED.length, false))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
        <span>← Lighter</span>
        <span>Darker →</span>
      </div>

      {/* Bleached legend */}
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="w-3 h-3 rounded border-2 border-dashed border-olo/40" />
        <span>0M shades are only achievable through professional / artificial whitening — not natural enamel.</span>
      </div>

      {/* Interpretation */}
      {hasCur && hasTgt && (
        <div className={`mt-4 p-3 rounded-2xl flex items-start gap-2 ${targetIsLighter ? 'bg-olo/10' : 'bg-amber-500/10'}`}>
          {targetIsLighter ? <ArrowRight className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /> : <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
          <p className={`text-xs leading-relaxed ${targetIsLighter ? 'text-olo' : 'text-amber-600 dark:text-amber-400'}`}>
            {targetIsLighter
              ? `Your target shade ${tgt} sits ${steps} step${steps === 1 ? '' : 's'} lighter than your current shade ${cur} on the VITA ladder${tgtIsBleached ? ' — a bleached shade, reachable only with professional whitening' : ''}.`
              : `Your target shade ${tgt} is not lighter than your current shade ${cur}.`}
          </p>
        </div>
      )}

      {/* Artificial whitening detected on the user's current shade */}
      {curIsBleached && (
        <div className="mt-3 p-3 rounded-2xl flex items-start gap-2 bg-olo-deep">
          <Info className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-white/80">
            Your current shade is a bleached shade ({cur}). teewai detects signs of professional / artificial whitening — your enamel has been lightened beyond natural tooth colour.
          </p>
        </div>
      )}
    </div>
  );
}