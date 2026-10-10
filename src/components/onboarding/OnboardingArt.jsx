// Three vector illustrations for the APK pre-sign-in onboarding slides.
// Flat matte enamel, radial gradients, soft ground shadows, hairline strokes,
// olo palette. Each has continuous micro-animations (CSS keyframes) that
// play only when the slide is active (onboard-active on the SVG root).
// Enhanced: floating particles, pulse rings, orbiting dots, sparkles.

const TOOTH_PATH =
  "M150 60 C120 60, 95 80, 95 115 C95 145, 110 180, 125 205 C135 220, 165 220, 175 205 C190 180, 205 145, 205 115 C205 80, 180 60, 150 60 Z";

const SMALL_TOOTH_PATH =
  "M150 120 C128 120, 112 134, 112 156 C112 174, 122 192, 132 204 C139 213, 161 213, 168 204 C178 192, 188 174, 188 156 C188 134, 172 120, 150 120 Z";

const BgGlow = ({ id }) => (
  <defs>
    <radialGradient id={id} cx="50%" cy="40%" r="60%">
      <stop offset="0%" stopColor="#00d9c0" stopOpacity="0.18" />
      <stop offset="100%" stopColor="#0a2e2e" stopOpacity="0" />
    </radialGradient>
  </defs>
);

const ToothGradient = ({ id }) => (
  <defs>
    <radialGradient id={id} cx="40%" cy="32%" r="70%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="60%" stopColor="#e8f8f5" />
      <stop offset="100%" stopColor="#b8e0d8" />
    </radialGradient>
  </defs>
);

export function ScanArt({ isActive }) {
  return (
    <svg viewBox="0 0 300 300" className={`w-full h-full onboard-art ${isActive ? 'onboard-active' : ''}`} aria-hidden="true">
      <BgGlow id="scan-bg" />
      <ToothGradient id="scan-tooth" />
      <rect width="300" height="300" fill="url(#scan-bg)" className="onboard-anim onboard-glow" />
      {/* Grid */}
      <g stroke="#00d9c0" strokeOpacity="0.07" strokeWidth="0.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="300" />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 50} x2="300" y2={i * 50} />
        ))}
      </g>
      {/* Floating particles drifting upward — scanning energy */}
      <circle cx="110" cy="225" r="2" fill="#00d9c0" opacity="0.5" className="onboard-anim onboard-particle" style={{ animationDelay: '0s' }} />
      <circle cx="150" cy="235" r="1.5" fill="#00d9c0" opacity="0.4" className="onboard-anim onboard-particle" style={{ animationDelay: '1.2s' }} />
      <circle cx="195" cy="228" r="2" fill="#00d9c0" opacity="0.5" className="onboard-anim onboard-particle" style={{ animationDelay: '2.4s' }} />
      <circle cx="130" cy="240" r="1.5" fill="#00d9c0" opacity="0.4" className="onboard-anim onboard-particle" style={{ animationDelay: '3s' }} />
      {/* Ground shadow */}
      <ellipse cx="150" cy="240" rx="62" ry="6" fill="rgba(0,0,0,0.18)" />
      {/* Tooth */}
      <path d={TOOTH_PATH} fill="url(#scan-tooth)" stroke="#00d9c0" strokeOpacity="0.3" strokeWidth="1" />
      {/* Scan beam glow + beam — sweeps vertically */}
      <g className="onboard-anim onboard-beam">
        <rect x="80" y="138" width="140" height="14" rx="7" fill="#00d9c0" opacity="0.12" />
        <rect x="80" y="141" width="140" height="3" rx="1.5" fill="#00d9c0" opacity="0.85" />
      </g>
      {/* Measurement nodes — pulse in sequence */}
      <circle cx="120" cy="100" r="4.5" fill="#00d9c0" className="onboard-anim onboard-node" style={{ animationDelay: '0s' }} />
      <circle cx="184" cy="118" r="4.5" fill="#00d9c0" className="onboard-anim onboard-node" style={{ animationDelay: '0.5s' }} />
      <circle cx="140" cy="172" r="4.5" fill="#00d9c0" className="onboard-anim onboard-node" style={{ animationDelay: '1s' }} />
      <circle cx="172" cy="182" r="3" fill="#00d9c0" opacity="0.6" className="onboard-anim onboard-node" style={{ animationDelay: '1.5s' }} />
      {/* Node connectors */}
      <line x1="120" y1="100" x2="184" y2="118" stroke="#00d9c0" strokeOpacity="0.35" strokeWidth="1" />
      <line x1="184" y1="118" x2="140" y2="172" stroke="#00d9c0" strokeOpacity="0.35" strokeWidth="1" />
      <line x1="140" y1="172" x2="172" y2="182" stroke="#00d9c0" strokeOpacity="0.25" strokeWidth="1" />
    </svg>
  );
}

export function TrackArt({ isActive }) {
  // "The Whitening Arc" — a sleek circular progress ring around a large
  // floating tooth. Three VITA shade swatches anchor the journey: yellow
  // (start, bottom-left), light cream (current, top, with pulse ring),
  // and white (goal, bottom-right). The progress arc breathes; the tooth
  // floats with a 3D sheen. Minimal, elegant, professional.
  return (
    <svg viewBox="0 0 300 300" className={`w-full h-full onboard-art ${isActive ? 'onboard-active' : ''}`} aria-hidden="true">
      <BgGlow id="track-bg" />
      <ToothGradient id="track-tooth" />
      <rect width="300" height="300" fill="url(#track-bg)" className="onboard-anim onboard-glow" />
      {/* Subtle caustic pool */}
      <ellipse cx="150" cy="150" rx="95" ry="78" fill="#00d9c0" opacity="0.06" className="onboard-anim onboard-glow" />
      {/* Background arc — the full journey (light) */}
      <path d="M 88 212 A 88 88 0 1 1 212 212" fill="none" stroke="#00d9c0" strokeOpacity="0.10" strokeWidth="2" strokeLinecap="round" />
      {/* Progress arc — filled so far (animated) */}
      <path d="M 88 212 A 88 88 0 0 1 150 62" fill="none" stroke="#00d9c0" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round"
        className="onboard-anim onboard-arc" />
      {/* Start swatch — yellow (bottom-left) */}
      <circle cx="88" cy="212" r="6" fill="#dccf90" stroke="#00d9c0" strokeOpacity="0.3" strokeWidth="1" className="onboard-anim onboard-dot" style={{ animationDelay: '0s' }} />
      {/* Current swatch — light cream (top) with "you are here" pulse */}
      <circle cx="150" cy="62" r="9" fill="none" stroke="#00d9c0" strokeWidth="1.5" className="onboard-anim onboard-pulse-ring" style={{ animationDelay: '0s' }} />
      <circle cx="150" cy="62" r="9" fill="none" stroke="#00d9c0" strokeWidth="1.5" className="onboard-anim onboard-pulse-ring" style={{ animationDelay: '1.25s' }} />
      <circle cx="150" cy="62" r="6" fill="#f4ecc8" stroke="#00d9c0" strokeOpacity="0.4" strokeWidth="1" className="onboard-anim onboard-dot" style={{ animationDelay: '0.6s' }} />
      {/* Goal swatch — white (bottom-right) */}
      <circle cx="212" cy="212" r="7" fill="#ffffff" stroke="#00d9c0" strokeOpacity="0.4" strokeWidth="1" className="onboard-anim onboard-dot" style={{ animationDelay: '1.2s' }} />
      {/* Subtle sparkle at the goal */}
      <circle cx="228" cy="198" r="1.5" fill="#ffffff" className="onboard-anim onboard-sparkle" style={{ animationDelay: '1.4s' }} />
      {/* Ground shadow */}
      <ellipse cx="150" cy="240" rx="52" ry="5" fill="rgba(0,0,0,0.15)" />
      {/* The tooth — large, centered, floating with 3D sheen */}
      <g className="onboard-anim onboard-float-a">
        <path d="M150 68 C120 68, 97 90, 97 126 C97 158, 112 190, 126 210 C136 223, 164 223, 174 210 C188 190, 203 158, 203 126 C203 90, 180 68, 150 68 Z"
          fill="url(#track-tooth)" stroke="#00d9c0" strokeOpacity="0.28" strokeWidth="1" />
        <ellipse cx="133" cy="105" rx="15" ry="9" fill="#ffffff" opacity="0.30" />
      </g>
      {/* Rising particles */}
      <circle cx="128" cy="130" r="2" fill="#00d9c0" opacity="0.45" className="onboard-anim onboard-particle" style={{ animationDelay: '0s' }} />
      <circle cx="172" cy="128" r="1.5" fill="#00d9c0" opacity="0.35" className="onboard-anim onboard-particle" style={{ animationDelay: '1.5s' }} />
    </svg>
  );
}

export function CommunityArt({ isActive }) {
  const satellites = [
    { cx: 80, cy: 85, s: 0.38, anim: 'onboard-float-a', delay: '0s' },
    { cx: 220, cy: 85, s: 0.38, anim: 'onboard-float-b', delay: '0.5s' },
    { cx: 70, cy: 215, s: 0.34, anim: 'onboard-float-c', delay: '1s' },
    { cx: 230, cy: 215, s: 0.34, anim: 'onboard-float-a', delay: '1.5s' },
    { cx: 150, cy: 48, s: 0.3, anim: 'onboard-float-b', delay: '2s' },
  ];
  return (
    <svg viewBox="0 0 300 300" className={`w-full h-full onboard-art ${isActive ? 'onboard-active' : ''}`} aria-hidden="true">
      <BgGlow id="comm-bg" />
      <ToothGradient id="comm-tooth" />
      <rect width="300" height="300" fill="url(#comm-bg)" className="onboard-anim onboard-glow" />
      {/* Pulse rings emanating from the heart */}
      <circle cx="150" cy="158" r="22" fill="none" stroke="#00d9c0" strokeWidth="1.5" className="onboard-anim onboard-pulse-ring" style={{ animationDelay: '0s' }} />
      <circle cx="150" cy="158" r="22" fill="none" stroke="#00d9c0" strokeWidth="1.5" className="onboard-anim onboard-pulse-ring" style={{ animationDelay: '1.25s' }} />
      {/* Connecting lines — shimmer in sequence */}
      <g stroke="#00d9c0" strokeWidth="1">
        {satellites.map((t, i) => (
          <line key={i} x1="150" y1="155" x2={t.cx} y2={t.cy}
            className="onboard-anim onboard-line" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
      </g>
      {/* Orbiting dots around the central tooth */}
      <g className="onboard-anim onboard-orbit">
        <circle cx="150" cy="95" r="3" fill="#00d9c0" opacity="0.6" />
        <circle cx="210" cy="155" r="2.5" fill="#00d9c0" opacity="0.4" />
        <circle cx="90" cy="155" r="2.5" fill="#00d9c0" opacity="0.4" />
      </g>
      {/* Central tooth */}
      <ellipse cx="150" cy="215" rx="42" ry="4" fill="rgba(0,0,0,0.18)" />
      <path d={SMALL_TOOTH_PATH} fill="url(#comm-tooth)" stroke="#00d9c0" strokeOpacity="0.4" strokeWidth="1.5" />
      {/* Heart on central tooth — beats */}
      <path d="M150 152 C144 146, 136 150, 136 158 C136 164, 150 173, 150 173 C150 173, 164 164, 164 158 C164 150, 156 146, 150 152 Z"
        fill="#00d9c0" opacity="0.85" className="onboard-anim onboard-heart" />
      {/* Satellite teeth — each floats with a different period.
          Outer <g> handles positioning (SVG transform attribute); inner
          <g> handles the CSS float animation. Without this split, the CSS
          transform property overrides the SVG transform attribute, causing
          the satellite teeth to jump to (0,0) and "disappear" from view. */}
      {satellites.map((t, i) => (
        <g key={i} transform={`translate(${t.cx} ${t.cy}) scale(${t.s}) translate(${-150} ${-150})`}>
          <g className={`onboard-anim ${t.anim}`} style={{ animationDelay: t.delay }}>
            <path d={SMALL_TOOTH_PATH} fill="url(#comm-tooth)" stroke="#00d9c0" strokeOpacity="0.25" strokeWidth="2" />
          </g>
        </g>
      ))}
    </svg>
  );
}