import Reveal from '@/components/Reveal';
import { ScanLine } from 'lucide-react';

export default function LandingScanDemo() {
  return (
    <section className="relative py-12 sm:py-20 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="font-heading font-700 text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance">
            See teewai score a smile
          </h2>
        </Reveal>

        <Reveal>
          <div className="relative max-w-2xl mx-auto">
            <div className="relative rounded-3xl border border-border bg-card p-3 sm:p-5 shadow-2xl shadow-olo/10">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-olo-deep to-slate-900">
                <img
                  src="https://images.unsplash.com/photo-1654373535457-383a0a4d00f9?w=800&q=80"
                  alt="Close-up of white teeth"
                  className="w-full h-full object-cover opacity-95"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-3/4 h-1.5 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-olo to-transparent animate-gradient"></div>
                  </div>
                  <div className="absolute left-[12%] right-[12%] h-[2px] bg-olo shadow-[0_0_20px_var(--olo-glow)] animate-scan-line"></div>
                </div>
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 glass px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-olo" />
                  <span className="text-xs font-medium text-white">Analyzing shade…</span>
                </div>
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 glass px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl">
                  <span className="text-xs text-white/60">Score</span>
                  <div className="text-xl sm:text-2xl font-heading font-800 text-olo leading-tight">78</div>
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'Whiteness', value: '78', sub: '/ 100' },
                { label: 'Shade', value: 'A2', sub: 'VITA scale' },
                { label: 'Brightness', value: '64%', sub: 'Reflectivity' },
              ].map((s) => (
                <div key={s.label} className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-card text-center overflow-hidden">
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">{s.label}</div>
                  <div className="mt-1 text-base sm:text-2xl font-heading font-700 text-olo truncate">{s.value}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="text-center mt-8 sm:mt-12">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 bg-olo/10 border border-olo/30 text-olo font-semibold px-6 py-3 rounded-xl text-sm hover:bg-olo/20 transition-colors"
          >
            Scan my teeth free
          </a>
          <p className="mt-3 text-xs text-muted-foreground">Your first 5 scans are on us — no credit card needed.</p>
        </Reveal>
      </div>
    </section>
  );
}