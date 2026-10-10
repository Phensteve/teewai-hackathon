import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, TrendingUp } from 'lucide-react';
import { LOGO_URL } from '@/components/Logo';

// Finch-style companion nurturing (CD1 + CD8, Octalysis).
// Core loop: do your self-care (scan) → teewai gains vitality → teewai goes
// adventuring. Vitality is full the day you scan and decays each day you don't,
// so the companion "needs" your smile — a gentle, non-punitive return driver.
//
// Design: the glow BLEEDS beyond the card (a blurred radial behind it) instead
// of being clipped by a hard box edge, so there's no "box-cut". The vitality
// orb is the hero — it fills on mount, breathes, and glows. A data-driven
// header (state + improvement chip + a real trend sparkline from the user's
// scan scores) ties it to the system instead of reading as decoration.

const STATES = [
  { min: 100, key: 'radiant',  label: 'Radiant',  emoji: '🌟' },
  { min: 70,  key: 'happy',    label: 'Happy',    emoji: '😊' },
  { min: 40,  key: 'content',  label: 'Content',  emoji: '🙂' },
  { min: 10,  key: 'tired',    label: 'Tired',    emoji: '😪' },
  { min: 1,   key: 'drooping', label: 'Drooping', emoji: '🥺' },
  { min: 0,   key: 'sleeping', label: 'Sleeping', emoji: '😴' },
];

const COPY = {
  radiant: "teewai is radiant! Your smile gave me a full day of energy — I'm off adventuring. ✨",
  happy: "teewai is happy. Your recent scan still glows — scan again to send me on a fresh adventure.",
  content: "teewai feels content. A new scan would top up my energy for today's adventure.",
  tired: "teewai is getting tired. Your smile fuels me — a quick scan will perk me right up.",
  drooping: "teewai is drooping. I miss your smile. Scan today and I'll bounce back.",
  sleeping: "teewai is sleeping, waiting to meet you. Your first scan will wake me. 💫",
};

// Tiny inline trend sparkline of whiteness scores (oldest → newest). Makes
// "look at that trend line" literal and ties the card to real scan data.
function TrendSparkline({ scores, width = 76, height = 26 }) {
  if (!scores || scores.length < 2) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min || 1;
  const pad = 3;
  const pts = scores.map((v, i) => {
    const x = (i / (scores.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y];
  });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${height} L ${pts[0][0].toFixed(1)} ${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--olo-glow))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(var(--olo-glow))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={line} fill="none" stroke="hsl(var(--olo-glow))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="#fff" />
    </svg>
  );
}

export default function CompanionVitality({ stats, message }) {
  const scans = stats?.scans;
  const scanArr = Array.isArray(scans) ? scans : [];
  const daysSinceScan = stats?.daysSinceScan ?? 999;
  const vitality = !scans ? 0 : Math.max(0, 100 - daysSinceScan * 25);
  const state = STATES.find((s) => vitality >= s.min) || STATES[STATES.length - 1];
  const full = vitality >= 100;
  const improvement = stats?.improvement || 0;
  const scoreSeries = scanArr.map((s) => s.score).filter((n) => typeof n === 'number').reverse(); // oldest → newest

  // Animate the ring filling from 0 → vitality on mount (satisfying).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const R = 34;
  const C = 2 * Math.PI * R;
  const dash = (mounted ? vitality : 0) / 100 * C;

  return (
    <div className="relative animate-fade-up">
      {/* Soft bleed-glow behind the card — extends beyond the edges so the
          glow is never clipped by a hard box (no "box-cut" edge). */}
      <div
        className="absolute -inset-4 rounded-[2.5rem] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(60% 60% at 50% 38%, hsl(var(--olo-glow) / 0.28), transparent 72%)' }}
      />
      <div className="relative overflow-hidden rounded-3xl bg-olo-deep text-white ring-1 ring-white/10 frost-edge">
        {/* Inner ambient light — soft, contained */}
        <div className="absolute inset-0 radial-olo opacity-50" />
        <div className="absolute -top-20 -right-10 w-56 h-56 bg-olo-glow/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-4">
          <div className="flex flex-row items-center gap-4">
            {/* Vitality orb — compact */}
            <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
              <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                <defs>
                  <linearGradient id="vitalityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--olo-glow))" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
                <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="5" />
                <circle
                  cx="40" cy="40" r={R} fill="none" stroke="url(#vitalityGrad)" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${dash} ${C}`}
                  style={{
                    transition: 'stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)',
                    filter: 'drop-shadow(0 0 7px hsl(var(--olo-glow) / 0.65))',
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-olo flex items-center justify-center olo-glow">
                  <img src={LOGO_URL} alt="teewai" className="w-6 h-6 rounded-md" />
                </div>
              </div>
              {/* Vitality % chip hugging the orb */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white/85 bg-white/10 border border-white/15 rounded-full px-1.5 py-0.5 whitespace-nowrap backdrop-blur-sm">
                {Math.round(vitality)}%
              </div>
            </div>

            {/* State + data header + nurturing copy + CTA */}
            <div className="flex-1 min-w-0 w-full text-left">
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white bg-white/10 border border-white/15 px-2 py-0.5 rounded-full">
                  <span>{state.emoji}</span> {state.label}
                </span>
                {improvement > 0 && scanArr.length >= 2 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-olo-glow/15 border border-olo-glow/25 px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3" /> +{Math.round(improvement)}
                  </span>
                )}
                {scoreSeries.length >= 2 && (
                  <span className="hidden sm:inline-flex items-center bg-white/5 border border-white/10 rounded-full px-1.5 py-0.5">
                    <TrendSparkline scores={scoreSeries} />
                  </span>
                )}
              </div>

              <p className="text-[13px] text-white/85 leading-snug line-clamp-2">{message?.text || COPY[state.key]}</p>

              {!full ? (
                <Link
                  to="/scan"
                  className="mt-2 inline-flex items-center gap-1.5 bg-white text-olo font-semibold px-3 py-1.5 rounded-lg text-xs active:scale-95 transition-transform"
                >
                  <Camera className="w-3.5 h-3.5" /> Give teewai energy
                </Link>
              ) : (
                <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-white/10 border border-white/15 rounded-full px-2.5 py-1">
                  <TrendingUp className="w-3 h-3 text-olo-glow" /> Adventuring — back tomorrow
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}