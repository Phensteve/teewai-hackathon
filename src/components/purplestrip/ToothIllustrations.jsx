// Three vector illustrations showing the optical trick:
// (1) a tooth with a yellow undertone
// (2) the same tooth with a translucent violet layer, neutralized to the eye
// (3) the scratch-off moment: white surface with yellow showing through
//
// Flat matte enamel style: smooth radial gradients for subtle depth, no
// glossy highlights, soft ground shadows for elevation, and hairline
// strokes for definition. All inline SVG, crisp at any size.

const TOOTH_PATH =
  "M50 10 C33 10, 20 21, 20 38 C20 52, 26 68, 34 80 C40 88, 60 88, 66 80 C74 68, 80 52, 80 38 C80 21, 67 10, 50 10 Z";

function IllustrationFrame({ children, label, sublabel, labelClass = "text-foreground" }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center w-full h-[120px]">
        {children}
      </div>
      <div className="text-center">
        <p className={`text-xs font-heading font-600 ${labelClass}`}>{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

export function ToothYellow() {
  return (
    <IllustrationFrame label="Yellow undertone" sublabel="Your natural shade">
      <svg width="120" height="120" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="yt-body" cx="40%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#f5ead0" />
            <stop offset="55%" stopColor="#e8d8a8" />
            <stop offset="100%" stopColor="#d0be78" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="93" rx="25" ry="3" fill="rgba(0,0,0,0.06)" />
        <path d={TOOTH_PATH} fill="url(#yt-body)" />
        <path d={TOOTH_PATH} fill="none" stroke="rgba(140,110,40,0.12)" strokeWidth="0.6" />
      </svg>
    </IllustrationFrame>
  );
}

export function ToothVioletLayer() {
  return (
    <IllustrationFrame
      label="Violet film applied"
      sublabel="Looks lighter to the eye"
      labelClass="text-violet-600 dark:text-violet-400"
    >
      <svg width="120" height="120" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="vt-body" cx="40%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#f5ead0" />
            <stop offset="55%" stopColor="#e8d8a8" />
            <stop offset="100%" stopColor="#d0be78" />
          </radialGradient>
          <radialGradient id="vt-film" cx="40%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
            <stop offset="55%" stopColor="#6d28d9" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.35" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="93" rx="25" ry="3" fill="rgba(0,0,0,0.06)" />
        <path d={TOOTH_PATH} fill="url(#vt-body)" />
        <path d={TOOTH_PATH} fill="url(#vt-film)" />
        <path d={TOOTH_PATH} fill="none" stroke="rgba(91,33,182,0.25)" strokeWidth="0.6" />
      </svg>
    </IllustrationFrame>
  );
}

export function ToothWipeOff() {
  return (
    <IllustrationFrame label="Scratch it off" sublabel="The yellow shows through">
      <svg width="120" height="120" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="wt-body" cx="40%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#f9f7f2" />
            <stop offset="55%" stopColor="#f0ede5" />
            <stop offset="100%" stopColor="#e0ddd4" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="93" rx="25" ry="3" fill="rgba(0,0,0,0.06)" />
        <path d={TOOTH_PATH} fill="url(#wt-body)" />
        {/* Yellow scratches revealing the natural undertone beneath the paint */}
        <path d="M30 30 Q50 25, 75 35" fill="none" stroke="#e8d5a0" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <path d="M28 45 Q50 40, 73 50" fill="none" stroke="#e0d098" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <path d="M32 58 Q50 53, 72 62" fill="none" stroke="#d8c888" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        <path d="M35 22 Q48 20, 68 28" fill="none" stroke="#e0d098" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M38 68 Q50 66, 70 72" fill="none" stroke="#d4c480" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
        <path d={TOOTH_PATH} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.6" />
      </svg>
    </IllustrationFrame>
  );
}

export default function ToothIllustrations() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <ToothYellow />
      <ToothVioletLayer />
      <ToothWipeOff />
    </div>
  );
}