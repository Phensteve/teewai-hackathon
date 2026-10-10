import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';

// Config-driven labor-illusion ritual (Buell & Norton 2011 — operational
// transparency). Reuses the ScanRitualOverlay visual language (sequential
// checkmark steps, dim→active→done, session ID stamp, monotonic progress bar)
// but accepts any stage list so every waiting flow in teewai shares one
// implementation.
//
// Step advancement:
//   • Auto-paced (curated ceremony) — steps advance on a timer over an
//     estimated duration. Used when the wait is an opaque AI/data call.
//   • Externally-driven (real operational transparency) — pass `activeStep`
//     and the parent advances it as each real computation completes (e.g.
//     the free scan's CIEDE2000 colorimetry pipeline).
//
// variant="dark"  → light text (parent provides a dark backdrop)
// variant="light" → foreground text (parent provides a light bg)
// overlay         → render as an absolute inset-0 black/85 layer with scan
//                   line + session chip (drop-in for ScanRitualOverlay)

const DEFAULT_STEP_MS = 550;

export default function AnalysisRitual({
  stages = [],
  loading,
  activeStep,        // optional externally-driven current step (0-indexed)
  progress,          // optional 0-100 monotonic bar (shown after steps complete)
  preliminary,       // optional { whiteness, shade } quick-read chip
  sessionId,         // optional session ID stamp
  variant = 'dark',
  footnote,          // optional small caption below the steps
  durationMs,        // optional total auto-pace duration
  overlay = false,   // absolute inset-0 backdrop layer (ScanUploader usage)
  className = '',
}) {
  const [autoStep, setAutoStep] = useState(0);
  const [done, setDone] = useState(false);

  const external = typeof activeStep === 'number';
  const hasProgress = typeof progress === 'number';
  const stepMs = durationMs ? durationMs / Math.max(1, stages.length) : DEFAULT_STEP_MS;

  useEffect(() => {
    if (!loading) { setAutoStep(0); setDone(false); return; }
    if (external) return; // parent drives the step index
    setAutoStep(0);
    setDone(false);
    const timers = [];
    for (let i = 1; i < stages.length; i++) {
      timers.push(setTimeout(() => setAutoStep(i), i * stepMs));
    }
    if (hasProgress) {
      // curated flow with a progress bar — mark all steps done so the bar takes over
      timers.push(setTimeout(() => setDone(true), stages.length * stepMs));
    } else {
      // no progress bar — hold the last step active until loading ends
      timers.push(setTimeout(() => setAutoStep(stages.length - 1), (stages.length - 1) * stepMs));
    }
    return () => timers.forEach(clearTimeout);
  }, [loading, external, stages.length, stepMs, hasProgress]);

  if (!loading || stages.length === 0) return null;

  const cur = external ? activeStep : autoStep;
  const allDone = external ? activeStep >= stages.length : (hasProgress && done);

  const dark = variant === 'dark';
  const text = dark ? 'text-white' : 'text-foreground';
  const subText = dark ? 'text-white/40' : 'text-muted-foreground';
  const dimText = dark ? 'text-white/40' : 'text-muted-foreground/60';
  const dotBg = dark ? 'bg-white/30' : 'bg-muted-foreground/30';
  const activeBg = dark ? 'bg-olo/20 border border-olo/50' : 'bg-olo/10 border border-olo/40';

  const steps = (
    <div className={`w-full max-w-sm mx-auto ${className}`}>
      <div className="space-y-3.5">
        {stages.map((step, i) => {
          const stepDone = i < cur || allDone;
          const active = i === cur && !allDone;
          const dim = !stepDone && !active;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 transition-all duration-300 ${dim ? 'opacity-30' : 'opacity-100'}`}
              style={{ transform: dim ? 'translateX(-6px)' : 'translateX(0)' }}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  stepDone ? 'bg-olo text-white' : active ? activeBg : dotBg
                }`}
              >
                {stepDone ? (
                  <Check className="w-4 h-4" />
                ) : active ? (
                  <Loader2 className="w-4 h-4 text-olo animate-spin" />
                ) : (
                  <span className={`w-2 h-2 rounded-full ${dotBg}`} />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${stepDone || active ? text : dimText}`}>{step.label}</p>
                <p className={`text-[11px] ${subText}`}>{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar — only for auto-paced curated flows with a progress value */}
      {!external && allDone && hasProgress && (
        <div className="mt-5 space-y-2 animate-fade-up">
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${dark ? 'bg-white/10' : 'bg-muted'}`}>
            <div className="h-full bg-olo rounded-full transition-[width] duration-200 ease-linear" style={{ width: `${Math.round(progress)}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <p className={`${subText} text-xs tabular-nums`}>{Math.round(progress)}%</p>
            {preliminary && (
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${dark ? 'bg-white/10 border border-white/15' : 'bg-olo/5 border border-olo/15'}`}>
                <span className={`text-[10px] uppercase tracking-wider ${subText}`}>Quick read</span>
                <span className="text-olo text-sm font-bold tabular-nums">{preliminary.whiteness}</span>
                <span className={`${subText} text-xs`}>· {preliminary.shade}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {footnote && (
        <p className={`mt-4 text-center text-[11px] ${subText}`}>{footnote}</p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-5 px-6">
        <div className="absolute inset-x-8 top-0 bottom-0 overflow-hidden pointer-events-none">
          <div className="absolute left-0 right-0 h-[3px] bg-olo shadow-[0_0_20px_var(--olo-glow)] animate-scan-line" />
        </div>
        {sessionId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 glass px-3.5 py-1.5 rounded-full whitespace-nowrap">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">Session</span>
            <span className="ml-2 text-[11px] font-mono text-olo tabular-nums">{sessionId}</span>
          </div>
        )}
        {steps}
      </div>
    );
  }

  return steps;
}