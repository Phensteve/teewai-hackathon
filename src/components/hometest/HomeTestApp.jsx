import HomeTestPhone from './HomeTestPhone';
import { AppStoreBadge, PlayStoreBadge } from '@/components/AppStoreBadges';

export default function HomeTestApp() {
  return (
    <section id="app" className="relative px-4 py-24 sm:py-32">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div data-reveal>
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf] font-semibold">teewai app</span>
          <h2 className="font-heading font-300 text-3xl sm:text-5xl tracking-tight mt-3 mb-4">Take teewai <span className="font-600 text-[#5eead4]">everywhere</span></h2>
          <p className="text-sm text-white/70 leading-relaxed font-light max-w-md mb-6">
            Snap, score and brighten on the go. teewai lands on iOS and Android soon.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <AppStoreBadge />
            <PlayStoreBadge />
          </div>
        </div>
        <div data-reveal className="flex justify-center lg:justify-end">
          <HomeTestPhone />
        </div>
      </div>
    </section>
  );
}