import { useMemo } from 'react';

// Shade Evolution — the Subway Surfers "World Tour" visual LiveOps principle,
// applied as a personal psychological mirror. Instead of rotating themes by
// calendar, the app's ambient glow *literally brightens* as the user's
// whiteness score improves — from warm amber (stained) through standard olo
// teal (improving) to luminous bright teal (A1 and beyond).
//
// This is a fixed, pointer-events-none overlay at very low opacity — a mood
// shift, not a distraction. It sits behind all content and never interferes
// with interaction or readability.

function shadeTone(score) {
  const s = Math.max(0, Math.min(100, score ?? 0));
  let hue, lightness, opacity;
  if (s < 50) {
    // Amber (stained) → teal (improving): hue shifts from 27° to 174°
    const t = s / 50;
    hue = 27 + (174 - 27) * t;
    lightness = 45;
    opacity = 0.035;
  } else {
    // Teal, increasing luminosity: lightness 42% → 55%, opacity 0.04 → 0.075
    const t = (s - 50) / 50;
    hue = 174;
    lightness = 42 + (55 - 42) * t;
    opacity = 0.04 + 0.035 * t;
  }
  return { hue, lightness, opacity };
}

export default function ShadeEvolutionOverlay({ score }) {
  const tone = useMemo(() => shadeTone(score), [score]);

  return (
    <div
      className="absolute inset-x-0 bottom-0 shade-overlay-extend pointer-events-none -z-10 transition-all duration-1000 ease-out"
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(${tone.hue} 90% ${tone.lightness}% / ${tone.opacity}), transparent 70%)`,
      }}
      aria-hidden="true"
    />
  );
}