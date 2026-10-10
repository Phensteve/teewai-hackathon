// Themed tooth illustrations for dashboard tip cards.
// Reuses the flat matte enamel style from the purple strip explainer:
// smooth radial gradients, soft ground shadows, hairline strokes.
// All inline SVG, crisp at any size, no external assets.

const TOOTH_PATH =
  "M50 10 C33 10, 20 21, 20 38 C20 52, 26 68, 34 80 C40 88, 60 88, 66 80 C74 68, 80 52, 80 38 C80 21, 67 10, 50 10 Z";

function Frame({ children }) {
  return (
    <div className="mt-3 flex justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="max-w-[120px] h-auto" aria-hidden="true">
        {children}
      </svg>
    </div>
  );
}

function YellowTooth() {
  return (
    <Frame>
      <defs>
        <radialGradient id="tipIllYellow" cx="40%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#f5ead0" />
          <stop offset="55%" stopColor="#e8d8a8" />
          <stop offset="100%" stopColor="#d0be78" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="93" rx="25" ry="3" fill="rgba(0,0,0,0.06)" />
      <path d={TOOTH_PATH} fill="url(#tipIllYellow)" />
      <path d={TOOTH_PATH} fill="none" stroke="rgba(140,110,40,0.12)" strokeWidth="0.6" />
    </Frame>
  );
}

function VioletTooth() {
  return (
    <Frame>
      <defs>
        <radialGradient id="tipIllVBody" cx="40%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#f5ead0" />
          <stop offset="55%" stopColor="#e8d8a8" />
          <stop offset="100%" stopColor="#d0be78" />
        </radialGradient>
        <radialGradient id="tipIllVFilm" cx="40%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
          <stop offset="55%" stopColor="#6d28d9" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="93" rx="25" ry="3" fill="rgba(0,0,0,0.06)" />
      <path d={TOOTH_PATH} fill="url(#tipIllVBody)" />
      <path d={TOOTH_PATH} fill="url(#tipIllVFilm)" />
      <path d={TOOTH_PATH} fill="none" stroke="rgba(91,33,182,0.25)" strokeWidth="0.6" />
    </Frame>
  );
}

function WipeTooth() {
  return (
    <Frame>
      <defs>
        <radialGradient id="tipIllWipe" cx="40%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#f9f7f2" />
          <stop offset="55%" stopColor="#f0ede5" />
          <stop offset="100%" stopColor="#e0ddd4" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="93" rx="25" ry="3" fill="rgba(0,0,0,0.06)" />
      <path d={TOOTH_PATH} fill="url(#tipIllWipe)" />
      <path d="M30 30 Q50 25, 75 35" fill="none" stroke="#e8d5a0" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M28 45 Q50 40, 73 50" fill="none" stroke="#e0d098" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <path d="M32 58 Q50 53, 72 62" fill="none" stroke="#d8c888" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <path d={TOOTH_PATH} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.6" />
    </Frame>
  );
}

function CleanTooth() {
  return (
    <Frame>
      <defs>
        <radialGradient id="tipIllClean" cx="40%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f4f9fb" />
          <stop offset="100%" stopColor="#d4ecf0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="93" rx="25" ry="3" fill="rgba(0,0,0,0.06)" />
      <path d={TOOTH_PATH} fill="url(#tipIllClean)" />
      <path d="M40 28 Q50 24, 62 30" fill="none" stroke="hsl(var(--olo))" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d={TOOTH_PATH} fill="none" stroke="hsl(var(--olo) / 0.15)" strokeWidth="0.6" />
    </Frame>
  );
}

function StainTooth() {
  return (
    <Frame>
      <defs>
        <radialGradient id="tipIllStain" cx="40%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#f5ead0" />
          <stop offset="55%" stopColor="#e8d8a8" />
          <stop offset="100%" stopColor="#d0be78" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="93" rx="25" ry="3" fill="rgba(0,0,0,0.06)" />
      <path d={TOOTH_PATH} fill="url(#tipIllStain)" />
      <path d="M35 35 Q45 32, 55 38" fill="none" stroke="#6b4423" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <path d="M42 50 Q50 48, 60 53" fill="none" stroke="#5a3a1a" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M30 45 Q38 43, 44 48" fill="none" stroke="#7a5230" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <path d={TOOTH_PATH} fill="none" stroke="rgba(140,110,40,0.12)" strokeWidth="0.6" />
    </Frame>
  );
}

function BrushTooth() {
  return (
    <Frame>
      <defs>
        <radialGradient id="tipIllBrush" cx="40%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f4f9fb" />
          <stop offset="100%" stopColor="#d4ecf0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="93" rx="25" ry="3" fill="rgba(0,0,0,0.06)" />
      <path d={TOOTH_PATH} fill="url(#tipIllBrush)" />
      <path d={TOOTH_PATH} fill="none" stroke="hsl(var(--olo) / 0.15)" strokeWidth="0.6" />
      {/* Brush handle coming from top-right */}
      <line x1="88" y1="8" x2="58" y2="30" stroke="hsl(var(--olo))" strokeWidth="3" strokeLinecap="round" />
      <rect x="54" y="26" width="10" height="8" rx="2" fill="hsl(var(--olo))" opacity="0.85" transform="rotate(35 59 30)" />
      {/* Bristles */}
      <line x1="56" y1="34" x2="54" y2="40" stroke="hsl(var(--olo) / 0.6)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="59" y1="32" x2="57" y2="38" stroke="hsl(var(--olo) / 0.6)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="62" y1="30" x2="60" y2="36" stroke="hsl(var(--olo) / 0.6)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Sparkle */}
      <circle cx="35" cy="30" r="1.5" fill="hsl(var(--olo))" opacity="0.5" />
      <circle cx="40" cy="25" r="1" fill="hsl(var(--olo))" opacity="0.4" />
    </Frame>
  );
}

const ILLUSTRATIONS = {
  tooth_yellow: YellowTooth,
  tooth_violet: VioletTooth,
  tooth_wipe: WipeTooth,
  tooth_clean: CleanTooth,
  tooth_stain: StainTooth,
  tooth_brush: BrushTooth,
};

export default function TipIllustration({ type }) {
  if (!type || type === 'none') return null;
  const Illus = ILLUSTRATIONS[type];
  if (!Illus) return null;
  return <Illus />;
}