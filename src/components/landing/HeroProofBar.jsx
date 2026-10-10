import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import HeroScoreCard from '@/components/landing/HeroScoreCard';

// Numbers-first authority hero — two-column copy + live score card, with a
// full-width proof stat bar anchored at the bottom edge of the hero.
export default function HeroProofBar() {
  const [scanCount, setScanCount] = useState(null);
  useEffect(() => {
    unrufld.functions.invoke('publicStats', {})
      .then((res) => setScanCount(res.data?.totalScans ?? null))
      .catch(() => setScanCount(null));
  }, []);

  const stats = [
    { value: scanCount == null ? '—' : `${Math.max(0, scanCount - 1).toLocaleString()}+`, label: 'smiles scanned' },
    { value: '4.9★', label: 'user rating' },
    { value: '5', label: 'free scans' },
    { value: 'VITA', label: 'calibrated shades' },
  ];

  return (
    <section className="relative z-10 min-h-screen min-h-[100svh] overflow-hidden text-white pt-28 pb-0 flex flex-col justify-center">
      <div className="absolute inset-0 radial-olo" />

      <div className="relative z-10 w-full mx-auto max-w-6xl px-4 sm:px-6 flex-1 flex items-center">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center w-full py-10">
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
            <h1 className="font-heading font-800 text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[0.95] tracking-tight text-balance">
              Whiten your smile
              <br />
              with <span className="text-olo olo-text-glow">AI precision</span>
            </h1>
            <p className="mt-5 text-sm sm:text-lg text-white/65 max-w-xl leading-relaxed text-balance">
              Snap a photo for an instant whiteness score, VITA shade match, and stain and plaque detection. Then follow a personalized plan backed by research that improves with every scan.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link to="/dashboard" className="group w-full sm:w-auto bg-olo text-white font-semibold px-8 py-4 rounded-2xl text-base sm:text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.03] olo-glow-strong">
                Scan my teeth
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#how" className="w-full sm:w-auto glass text-white font-medium px-8 py-4 rounded-2xl text-base sm:text-lg flex items-center justify-center hover:bg-white/10 transition-all">
                See how it works
              </a>
            </div>
            <p className="mt-5 inline-flex items-center gap-1.5 text-xs sm:text-sm text-white/70">
              <ShieldCheck className="w-4 h-4 text-olo" />
              <span><span className="text-olo font-semibold">5 free scans</span> no card needed</span>
            </p>
          </div>

          <div className="flex justify-center lg:justify-end animate-float mt-4 lg:mt-0">
            <HeroScoreCard />
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {stats.map((s) => (
            <div key={s.label} className="py-5 sm:py-6 text-center">
              <p className="font-heading font-800 text-xl sm:text-3xl text-white tabular-nums">{s.value}</p>
              <p className="text-[11px] sm:text-xs text-white/45 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}