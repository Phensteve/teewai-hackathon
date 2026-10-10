import { useEffect, useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

// Full-screen celebration overlay shown after a successful auth action
// (signup complete, sign-in complete). On-brand teewai: teal particle burst,
// warm welcome using the user's name, one clear CTA. Auto-dismisses after 2s
// if autoDismiss + onCTA are set, or the user can tap the CTA sooner.
// Reduced-motion: static celebratory screen (no particles, no auto-dismiss).
//
// Props:
//   title       — e.g. "Welcome to teewai, Ada!"
//   subtitle    — short positive copy
//   ctaLabel    — e.g. "Go to dashboard"
//   onCTA       — callback when CTA tapped or auto-dismiss fires
//   autoDismiss — if true + onCTA, fires onCTA after 2s
//   variant     — "signup" | "signin" (controls particle count / icon)

const PARTICLES = Array.from({ length: 14 }, (_, i) => i);

export default function AuthCelebration({
  title,
  subtitle,
  ctaLabel,
  onCTA,
  autoDismiss = true,
  variant = 'signup',
}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return; // no auto-dismiss for reduced motion — user taps CTA
    if (autoDismiss && onCTA) {
      const t = setTimeout(onCTA, 2000);
      return () => clearTimeout(t);
    }
  }, [autoDismiss, onCTA, reduced]);

  // Pre-compute particle angles/distances so they don't change on re-render
  const particleData = useMemo(
    () =>
      PARTICLES.map((i) => {
        const angle = (i / PARTICLES.length) * Math.PI * 2 + (i % 2) * 0.3;
        const dist = 80 + (i % 4) * 30;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          delay: (i % 5) * 0.04,
          size: 4 + (i % 3) * 2,
        };
      }),
    []
  );

  return (
    <div className="fixed inset-0 z-[100] bg-olo-deep/95 backdrop-blur-sm flex items-center justify-center px-6">
      {/* Particle burst — teal dots radiating outward. Disabled for reduced motion. */}
      {!reduced && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {particleData.map((p, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-olo auth-celebration-particle"
              style={{
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}s`,
                '--tx': `${p.x}px`,
                '--ty': `${p.y}px`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative flex flex-col items-center gap-3 text-center animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-olo/15 flex items-center justify-center olo-glow">
          <CheckCircle2 className="w-9 h-9 text-olo" />
        </div>
        <p className="font-heading font-700 text-xl text-white">{title}</p>
        {subtitle && <p className="text-sm text-white/70 max-w-xs">{subtitle}</p>}
        {ctaLabel && onCTA && (
          <button
            type="button"
            onClick={onCTA}
            className="mt-3 inline-flex items-center justify-center bg-olo text-white font-semibold px-7 py-3 rounded-xl hover:scale-105 active:scale-95 transition-transform olo-glow"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}