import { useEffect, useState } from 'react';

export default function ScoreCircle({ score, size = 160, color = 'hsl(var(--olo))', tiers }) {
  const [animated, setAnimated] = useState(0);
  const stroke = Math.max(8, Math.round(size * 0.08));
  const glow = Math.max(7, Math.round(size * 0.07));
  // Reserve room for the glow inside the SVG viewport so the halo renders as a
  // full circle instead of being clipped into a box at the edge.
  const radius = Math.max(stroke, (size - stroke) / 2 - glow - 2);
  const circumference = 2 * Math.PI * radius;
  const hasScore = score != null && !Number.isNaN(score);
  const clamped = Math.max(0, Math.min(100, hasScore ? score : 0));

  useEffect(() => {
    const t = setTimeout(() => setAnimated(clamped), 100);
    return () => clearTimeout(t);
  }, [clamped]);

  const offset = circumference - (animated / 100) * circumference;

  const labelTiers = tiers || [
    { min: 80, label: 'Excellent' },
    { min: 60, label: 'Good' },
    { min: 40, label: 'Fair' },
  ];
  let label = 'Needs work';
  for (const t of labelTiers) if (clamped >= t.min) { label = t.label; break; }

  const numberSize = Math.round(size * 0.19);
  const labelSize = Math.max(7, Math.round(size * 0.062));

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ overflow: 'visible' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} opacity="0.55" />
        {hasScore && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 ${glow}px ${color})` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1.5 text-center">
        <span className="font-heading font-800 leading-none" style={{ color, fontSize: numberSize }}>
          {hasScore ? Math.round(animated) : '—'}
        </span>
        <span className="uppercase tracking-wide text-muted-foreground font-medium leading-none whitespace-nowrap" style={{ fontSize: labelSize }}>
          {hasScore ? label : 'No data'}
        </span>
      </div>
    </div>
  );
}