import Reveal from '@/components/Reveal';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ShowcaseStage from '@/components/landing/ShowcaseStage';
import MoreScreensScroll from '@/components/landing/MoreScreensScroll';

export default function LandingPhoneShowcase() {
  return (
    <>
      <section className="relative z-10 pt-[8.5rem] sm:pt-28 pb-8 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-[0.12]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <h2 className="font-heading font-800 text-[2rem] sm:text-5xl md:text-6xl tracking-tight leading-[1.04] text-balance">
              This is what teewai <span className="text-muted-foreground/50">actually looks like.</span>
            </h2>
          </Reveal>
        </div>
      </section>

      {/* Scroll-driven horizontal pan through the three core screens */}
      <ShowcaseStage />

      {/* "And everything around it" — phones emerge from the left */}
      <MoreScreensScroll />

      <section className="relative z-10 pt-8 pb-16 sm:pt-10 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-[0.12]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="flex flex-col items-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-foreground text-background font-semibold px-8 py-4 rounded-full text-base hover:scale-105 transition-transform"
            >
              Get your free scan
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">Your first scan is on us. No credit card needed.</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}