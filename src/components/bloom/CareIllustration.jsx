import { useId } from 'react';

// Inline SVG illustrations for the bloom care-logging guide. Two variants:
// "brush" shows a tooth with a toothbrush, "water" shows a glass with water.
// Both use currentColor so they inherit the habit color token from the parent.
export default function CareIllustration({ action, className = 'w-16 h-16' }) {
  const id = useId();
  const water = action === 'water';

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="hsl(var(--card))" />
          <stop offset="1" stopColor="hsl(var(--muted))" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="90" rx="30" ry="4" fill="currentColor" opacity="0.1" />

      {water ? (
        <>
          {/* Glass body */}
          <path d="M25 22 H75 L68 83 Q50 92 32 83 Z" fill={`url(#${id}-glass)`} stroke="currentColor" strokeWidth="2" />
          {/* Water surface */}
          <path d="M30 48 Q42 43 52 48 T70 48 L65 79 Q50 85 35 79 Z" fill="currentColor" opacity="0.35" />
          {/* Rim highlight */}
          <path d="M29 22 Q50 29 71 22" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          {/* Water drop above */}
          <path d="M51 7 Q41 20 51 24 Q61 20 51 7Z" fill="currentColor" />
          {/* Bubbles */}
          <circle cx="45" cy="64" r="3" fill="currentColor" opacity="0.4" />
          <circle cx="58" cy="72" r="2" fill="currentColor" opacity="0.4" />
        </>
      ) : (
        <>
          {/* Tooth */}
          <path
            d="M46 22 C21 12 16 33 24 53 L32 80 Q37 90 43 73 L49 58 Q52 55 55 61 L62 79 Q67 90 73 71 L81 45 C86 22 67 15 57 22 Q51 26 46 22Z"
            fill={`url(#${id}-glass)`}
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Toothbrush */}
          <g transform="rotate(-28 62 35)">
            <rect x="43" y="29" width="47" height="8" rx="4" fill="currentColor" />
            <rect x="40" y="25" width="20" height="12" rx="3" fill="currentColor" />
            <path d="M43 37 V45 M47 37 V45 M51 37 V45 M55 37 V45" stroke="currentColor" strokeWidth="2" />
          </g>
          {/* Sparkles */}
          <path d="M22 12 V22 M17 17 H27 M78 60 V70 M73 65 H83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="33" cy="39" r="2" fill="currentColor" opacity="0.5" />
        </>
      )}
    </svg>
  );
}