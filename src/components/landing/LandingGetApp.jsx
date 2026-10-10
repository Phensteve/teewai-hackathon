import Reveal from '@/components/Reveal';
import Logo from '@/components/Logo';
import { AppStoreBadge, PlayStoreBadge } from '@/components/AppStoreBadges';
import { Camera } from 'lucide-react';

export default function LandingGetApp() {
  return (
    <section className="relative z-10 py-12 sm:py-20 overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Copy + store badges */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Logo size={36} className="olo-glow" />
              <span className="font-heading font-700 text-xl">teewai</span>
            </div>
            <h2 className="font-heading font-700 text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance mb-4">
              Take teewai everywhere your smile goes
            </h2>
            <p className="text-sm text-olo font-medium mb-2">Your first scan is free. No credit card needed.</p>
            <p className="text-muted-foreground leading-relaxed mb-6 max-w-md">
              Snap, score and brighten on the go. teewai lands on iOS and Android soon.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <AppStoreBadge />
              <PlayStoreBadge />
            </div>
          </div>

          {/* Phone mock */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute -inset-6 bg-olo/10 blur-[80px] rounded-full" />
            <div className="relative w-[250px] sm:w-[270px]">
              <div className="relative rounded-[2.75rem] border-[5px] border-olo-deep bg-olo-deep p-2 shadow-[0_30px_80px_-20px_rgba(0,217,192,0.4)]">
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-white/25 z-10" />
                <div className="rounded-[2.25rem] overflow-hidden bg-background aspect-[9/19] flex flex-col">
                  <div className="flex items-center gap-2 px-5 pt-6 pb-3">
                    <Logo size={28} className="olo-glow" />
                    <span className="font-heading font-700 text-sm">teewai</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center px-5 gap-3">
                    <div className="w-16 h-16 rounded-full bg-olo flex items-center justify-center olo-glow">
                      <Camera className="w-7 h-7 text-white" />
                    </div>
                    <p className="font-heading font-700 text-base text-center">Scan my teeth</p>
                    <p className="text-[10px] text-muted-foreground text-center leading-tight">Snap a photo · Get your VITA shade in 90 seconds</p>
                  </div>
                  <div className="px-5 pb-6 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-olo" /> iOS &amp; Android
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}