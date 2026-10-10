import { useEffect, useState, useRef } from 'react';

// Inline SVG color wheel showing the yellow-violet complementary axis.
// A smooth conic-gradient wheel with the yellow and violet poles highlighted,
// plus an animated pointer that glides between the two showing the optical
// cancellation. Premium and restrained: reads as a scientific instrument.
//
// The pointer oscillates between yellow (60 deg) and violet (270 deg) on a
// 4-second cycle. Under prefers-reduced-motion it stays centered between them.
export default function ColorWheel({ size = 220 }) {
  const [angle, setAngle] = useState(165); // start between yellow and violet
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setAngle(165);
      return;
    }

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;
      // 4-second cycle: ease between 60deg (yellow) and 270deg (violet)
      const phase = (elapsed % 4) / 4;
      const eased = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      setAngle(60 + eased * 210);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 18;
  const pointerR = r + 6;
  const px = cx + pointerR * Math.cos((angle - 90) * Math.PI / 180);
  const py = cy + pointerR * Math.sin((angle - 90) * Math.PI / 180);

  // Yellow pole position (60 deg) and violet pole position (270 deg)
  const yellowAngle = 60;
  const violetAngle = 270;
  const yellowX = cx + (r + 12) * Math.cos((yellowAngle - 90) * Math.PI / 180);
  const yellowY = cy + (r + 12) * Math.sin((yellowAngle - 90) * Math.PI / 180);
  const violetX = cx + (r + 12) * Math.cos((violetAngle - 90) * Math.PI / 180);
  const violetY = cy + (r + 12) * Math.sin((violetAngle - 90) * Math.PI / 180);

  // Build the conic gradient stops for the wheel
  const stops = [];
  for (let i = 0; i <= 360; i += 10) {
    stops.push(`${i}`);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="max-w-full">
        <defs>
          <radialGradient id="wheelFade" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.35" />
          </radialGradient>
        </defs>

        {/* Conic gradient wheel via 36 colored sectors */}
        <g>
          {Array.from({ length: 36 }, (_, i) => {
            const a1 = i * 10;
            const a2 = (i + 1) * 10;
            const rad1 = (a1 - 90) * Math.PI / 180;
            const rad2 = (a2 - 90) * Math.PI / 180;
            const x1 = cx + r * Math.cos(rad1);
            const y1 = cy + r * Math.sin(rad1);
            const x2 = cx + r * Math.cos(rad2);
            const y2 = cy + r * Math.sin(rad2);
            const hue = a1;
            const fill = `hsl(${hue}, 70%, 55%)`;
            return (
              <path
                key={i}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                fill={fill}
                opacity={0.85}
              />
            );
          })}
        </g>

        {/* Subtle inner fade for depth */}
        <circle cx={cx} cy={cy} r={r} fill="url(#wheelFade)" />

        {/* Yellow-violet complementary axis line */}
        <line
          x1={cx + r * Math.cos((yellowAngle - 90) * Math.PI / 180)}
          y1={cy + r * Math.sin((yellowAngle - 90) * Math.PI / 180)}
          x2={cx + r * Math.cos((violetAngle - 90) * Math.PI / 180)}
          y2={cy + r * Math.sin((violetAngle - 90) * Math.PI / 180)}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2"
          strokeDasharray="4 3"
          opacity={0.7}
        />

        {/* Emphasis markers on yellow and violet poles */}
        <circle cx={cx + r * Math.cos((yellowAngle - 90) * Math.PI / 180)} cy={cy + r * Math.sin((yellowAngle - 90) * Math.PI / 180)} r="5" fill="#facc15" stroke="#fff" strokeWidth="2" />
        <circle cx={cx + r * Math.cos((violetAngle - 90) * Math.PI / 180)} cy={cy + r * Math.sin((violetAngle - 90) * Math.PI / 180)} r="5" fill="#8b5cf6" stroke="#fff" strokeWidth="2" />

        {/* Center hub */}
        <circle cx={cx} cy={cy} r="14" fill="#fff" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="3" fill="#8b5cf6" />

        {/* Animated pointer */}
        <g style={{ transition: 'none' }}>
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#fff" strokeWidth="2.5" opacity={0.9} />
          <circle cx={px} cy={py} r="4" fill="#fff" stroke="#8b5cf6" strokeWidth="2" />
        </g>

        {/* Labels */}
        <text x={yellowX} y={yellowY} textAnchor="middle" dominantBaseline="middle" className="fill-yellow-600 dark:fill-yellow-400" fontSize="11" fontWeight="600">Yellow</text>
        <text x={violetX} y={violetY} textAnchor="middle" dominantBaseline="middle" className="fill-violet-600 dark:fill-violet-400" fontSize="11" fontWeight="600">Violet</text>
      </svg>
      <p className="text-xs text-muted-foreground text-center max-w-[200px]">
        Complementary colors cancel each other to the eye
      </p>
    </div>
  );
}