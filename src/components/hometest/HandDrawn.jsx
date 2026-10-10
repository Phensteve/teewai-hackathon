// Hand-drawn SVG accents — intentionally imperfect to break the "AI-clean" feel.
// These make key words feel annotated by a real person, not generated.

export function HandUnderline({ className = '', color = '#5eead4', style = {} }) {
  return (
    <svg className={className} style={style} viewBox="0 0 200 12" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M3 7 Q 18 2, 35 6 Q 52 10, 70 5 Q 88 1, 105 7 Q 122 11, 140 5 Q 158 2, 175 6 Q 185 8, 197 5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function HandCircle({ className = '', color = '#5eead4', style = {} }) {
  return (
    <svg className={className} style={style} viewBox="0 0 140 90" fill="none" aria-hidden="true">
      <path
        d="M70 6 C 40 5, 12 18, 8 42 C 5 62, 28 80, 68 82 C 108 84, 128 68, 132 46 C 135 24, 112 8, 78 5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function HandArrow({ className = '', color = '#5eead4', style = {} }) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 50" fill="none" aria-hidden="true">
      <path
        d="M8 28 Q 30 14, 55 24 Q 75 32, 92 22"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M92 22 L 84 16 M92 22 L 86 30"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function HandStar({ className = '', color = '#5eead4', style = {} }) {
  return (
    <svg className={className} style={style} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M20 4 Q 22 16, 34 20 Q 22 22, 20 36 Q 18 22, 6 20 Q 18 18, 20 4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function HandSquiggle({ className = '', color = '#5eead4', style = {} }) {
  return (
    <svg className={className} style={style} viewBox="0 0 160 20" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M4 10 Q 14 3, 24 10 Q 34 17, 44 10 Q 54 3, 64 10 Q 74 17, 84 10 Q 94 3, 104 10 Q 114 17, 124 10 Q 134 3, 156 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// A small maker's mark — like a craftsman signing their work
export function MakersMark({ className = '', color = '#5eead4', style = {} }) {
  return (
    <svg className={className} style={style} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* A stylized tooth inside a hand-drawn circle */}
      <path
        d="M24 4 C 12 4, 4 12, 4 24 C 4 36, 12 44, 24 44 C 36 44, 44 36, 44 24 C 44 12, 36 4, 24 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M24 14 Q 19 14, 17 19 Q 15 24, 17 29 Q 19 34, 22 34 Q 24 34, 24 30 Q 24 34, 26 34 Q 29 34, 31 29 Q 33 24, 31 19 Q 29 14, 24 14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}