import { useState, useEffect } from 'react';
import { useTour, TOUR_STEPS } from '@/lib/tourContext';
import { X, ArrowRight, Check, Compass } from 'lucide-react';

// Spotlight walkthrough overlay. Highlights elements with matching
// data-tour attributes, shows a tooltip, and lets the user step through
// or close at any time. Falls back to a centered modal for steps with
// no target (welcome / finale).
export default function TourOverlay() {
  const { active, step, close, next, goTo, total } = useTour();
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const update = () => {
      const s = TOUR_STEPS[step];
      if (!s || s.target === null) { if (!cancelled) setRect(null); return; }
      const els = document.querySelectorAll(`[data-tour="${s.target}"]`);
      for (const el of els) {
        const r = el.getBoundingClientRect();
        // Only spotlight elements that are actually visible in the viewport.
        // Sidebar nav items that are scrolled out of view still have non-zero
        // width/height but sit outside the viewport — skip them so the tour
        // falls back to a centered modal until scrollIntoView brings them in.
        if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight) {
          if (!cancelled) setRect(r);
          return;
        }
      }
      if (!cancelled) setRect(null);
    };

    update();
    const id = setTimeout(update, 120);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelled = true;
      clearTimeout(id);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, step]);

  // Scroll the tour target into view when the step changes. On desktop the
  // sidebar is a scrollable nav — edited items pushed some tour targets (e.g.
  // Profile) below the fold. This scrolls the nearest scrollable container
  // (the sidebar nav) to center the target before the spotlight appears.
  useEffect(() => {
    if (!active) return;
    const s = TOUR_STEPS[step];
    if (!s || s.target === null) return;

    const scrollIntoView = () => {
      const els = document.querySelectorAll(`[data-tour="${s.target}"]`);
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          const visible = r.top >= 0 && r.bottom <= window.innerHeight;
          if (!visible) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
    };

    const raf = requestAnimationFrame(scrollIntoView);
    return () => cancelAnimationFrame(raf);
  }, [active, step]);

  if (!active) return null;

  const stepData = TOUR_STEPS[step];
  if (!stepData) return null;

  const isLast = step === total - 1;
  const isFirst = step === 0;
  const isCentered = stepData.target === null || !rect;

  const tooltipWidth = Math.min(320, window.innerWidth - 32);
  let style;
  if (isCentered) {
    style = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: tooltipWidth };
  } else {
    const gap = 16;
    const placeAbove = rect.top > window.innerHeight * 0.55;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    style = placeAbove
      ? { bottom: window.innerHeight - rect.top + gap, left, width: tooltipWidth }
      : { top: rect.bottom + gap, left, width: tooltipWidth };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {rect && !isCentered ? (
        <div
          className="absolute pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            borderRadius: '1rem',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/78 backdrop-blur-sm" />
      )}

      {/* Click catcher — closes on backdrop tap */}
      <div className="absolute inset-0" onClick={close} />

      {/* Tooltip */}
      <div className="absolute transition-all duration-300" style={style}>
        <div className="bg-card border border-olo/30 rounded-2xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-heading font-700 text-base pt-1">{stepData.title}</h3>
            <button onClick={close} className="ml-auto text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" aria-label="Close tour">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">{stepData.body}</p>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-olo' : 'w-1.5 bg-muted-foreground/30'}`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isLast && !isFirst && (
                <button onClick={close} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
                  Skip
                </button>
              )}
              {isLast ? (
                <button onClick={close} className="inline-flex items-center gap-1.5 bg-olo text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform">
                  <Check className="w-4 h-4" /> {stepData.cta || 'Got it'}
                </button>
              ) : (
                <button onClick={next} className="inline-flex items-center gap-1.5 bg-olo text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform">
                  {stepData.cta || 'Next'} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}