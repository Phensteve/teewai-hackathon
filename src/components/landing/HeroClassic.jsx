import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { ArrowRight, Star, ShieldCheck, Gauge, Droplet, Route } from 'lucide-react';
import HeroScoreCard from '@/components/landing/HeroScoreCard';

// Original hero — two-column: transformation headline, dual CTAs, feature
// pills, friction reducer + social proof near the CTA, and the live score card.
export default function HeroClassic() {
  const [scanCount, setScanCount] = useState(null);
  useEffect(() => {
    unrufld.functions.invoke('publicStats', {})
      .then((res) => setScanCount(res.data?.totalScans ?? null))
      .catch(() => setScanCount(null));
  }, []);

  return (
    <section className="relative z-10 min-h-screen min-h-[100svh] overflow-hidden text-white pt-32 sm:pt-28 pb-16 px-4 sm:px-6 flex items-center">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute inset-0 radial-olo" />

      <div className="relative z-10 w-full mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
            <h1 className="font-heading font-800 text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[0.95] tracking-tight text-balance">
              Whiten your smile
              <br />
              with <span className="text-olo olo-text-glow">AI precision</span>
            </h1>

            <p className="mt-5 text-sm sm:text-lg text-white/65 max-w-xl leading-relaxed text-balance">
              Snap a photo for an instant whiteness score, VITA shade match, and stain and plaque detection. Then follow a personalized plan backed by research that improves with every scan.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-2">
              {[
                { icon: Gauge, label: 'Instant AI score' },
                { icon: Droplet, label: 'Stain detection' },
                { icon: Route, label: 'Personalized plan' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs text-white/80">
                  <Icon className="w-3.5 h-3.5 text-olo" /> {label}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link
                to="/dashboard"
                className="group w-full sm:w-auto bg-olo text-white font-semibold px-8 py-4 rounded-2xl text-base sm:text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.03] olo-glow-strong"
              >
                Scan my teeth
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how"
                className="group w-full sm:w-auto glass text-white font-medium px-8 py-4 rounded-2xl text-base sm:text-lg flex items-center justify-center hover:bg-white/10 transition-all"
              >
                See how it works
              </a>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
              <p className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-white/70">
                <ShieldCheck className="w-4 h-4 text-olo" />
                <span><span className="text-olo font-semibold">5 free scans</span> no card needed</span>
              </p>
              <div className="hidden sm:block h-4 w-px bg-white/15" />
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2">
                  {['#0d9f8e', '#16c2a6', '#5eead4', '#2dd4bf'].map((c, i) => (
                    <span key={i} className="w-6 h-6 rounded-full border-2 border-olo-deep" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex flex-col leading-none">
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading font-700 text-lg text-white tabular-nums">
                      {scanCount == null ? <span className="inline-block w-8 h-4 rounded bg-white/15 animate-pulse align-middle" /> : `${Math.max(0, scanCount - 1).toLocaleString()}+`}
                    </span>
                    <div className="flex items-center gap-0.5 text-olo">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                  </div>
                  <span className="text-[11px] text-white/45 mt-1">smiles scanned</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end animate-float mt-4 lg:mt-0">
            <HeroScoreCard />
          </div>
        </div>
      </div>
    </section>
  );
}