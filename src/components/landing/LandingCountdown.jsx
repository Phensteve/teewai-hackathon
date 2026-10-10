import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInMilliseconds } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import heroConfig from '@/components/landing/heroVariants.json';

function useRemaining(deadline) {
  const [remaining, setRemaining] = useState(() => differenceInMilliseconds(new Date(deadline), new Date()));
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, differenceInMilliseconds(new Date(deadline), new Date())));
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return remaining;
}

function Unit({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-heading font-800 text-3xl sm:text-5xl text-olo-glow tabular-nums olo-text-glow">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/50">{label}</span>
    </div>
  );
}

export default function LandingCountdown() {
  const cfg = heroConfig.countdown;
  const ms = useRemaining(cfg?.deadline || new Date().toISOString());
  if (!cfg) return null;
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return (
    <section className="relative z-10 py-14 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="relative rounded-3xl bg-olo-deep frost-edge overflow-hidden p-7 sm:p-12 text-center">
          <div className="absolute inset-0 radial-olo opacity-60 pointer-events-none" />
          <div className="relative z-10">
            <span className="text-label text-olo/70">Limited launch</span>
            <h2 className="font-heading font-700 text-2xl sm:text-4xl tracking-tight text-white text-balance mt-3">
              {cfg.headline}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-white/60 max-w-xl mx-auto text-balance">{cfg.subtext}</p>

            <div className="mt-8 flex items-center justify-center gap-4 sm:gap-8">
              <Unit value={days} label="Days" />
              <span className="font-heading font-800 text-2xl sm:text-4xl text-white/25">:</span>
              <Unit value={hours} label="Hours" />
              <span className="font-heading font-800 text-2xl sm:text-4xl text-white/25">:</span>
              <Unit value={minutes} label="Minutes" />
              <span className="font-heading font-800 text-2xl sm:text-4xl text-white/25">:</span>
              <Unit value={seconds} label="Seconds" />
            </div>

            <Link
              to={cfg.ctaLink || '/free-scan'}
              className="mt-9 inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-full hover:bg-olo-glow transition-colors scan-cta-text"
            >
              {cfg.cta || 'Claim my free scan'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}