import { Check, Infinity as InfinityIcon, Users, ArrowRight } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/use-currency';
import StickyCurrencySwitcher from '@/components/StickyCurrencySwitcher';
import { FAMILY } from '@/lib/payment';

const starterPack = {
  name: 'Starter',
  priceUsd: 0.99,
  scans: '5 scans',
  desc: 'Try teewai out',
  cta: 'Get Starter',
};

const unlimitedMonthly = {
  name: 'Unlimited',
  priceUsd: 24.99,
  period: '/month',
  desc: 'Unlimited scanning',
  features: [],
  cta: 'Go Unlimited',
  saveNote: 'Save 14% vs paying per scan',
};

export default function LandingPricing() {
  const { format } = useCurrency();
  return (
    <section id="pricing" className="relative z-10 py-12 sm:py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-14">
          <h2 className="font-heading font-700 text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance">
            Scan packs or go unlimited
          </h2>
          <p className="mt-4 text-sm sm:text-lg text-muted-foreground text-balance">
            Pay per pack, or unlock unlimited scanning.
          </p>
        </Reveal>

        <StickyCurrencySwitcher topClassName="top-[calc(7.5rem_+_env(safe-area-inset-top))] lg:top-[7.5rem]" />

        {/* Starter pack + Unlimited monthly */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto mb-6 sm:mb-8">
          <Reveal>
            <div className="relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border bg-card hover:border-olo/40 transition-all duration-300 h-full">
              <h3 className="font-heading font-600 text-xl sm:text-2xl">{starterPack.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{starterPack.desc}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-heading font-800 text-3xl sm:text-4xl">{format(starterPack.priceUsd)}</span>
                <span className="text-muted-foreground text-sm">/ {starterPack.scans}</span>
              </div>
              <Link
                to="/register"
                className="mt-6 block text-center font-semibold px-6 py-3 rounded-2xl transition-all hover:scale-105 bg-olo/10 text-olo hover:bg-olo/20"
              >
                {starterPack.cta}
              </Link>

            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="relative p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-olo bg-olo-deep text-white olo-glow-strong scale-[1.02] h-full">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-600 text-xl sm:text-2xl">{unlimitedMonthly.name}</h3>
                <InfinityIcon className="w-5 h-5 text-olo" />
              </div>
              <p className="text-sm mt-1 text-white/60">{unlimitedMonthly.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-heading font-800 text-4xl sm:text-5xl">{format(unlimitedMonthly.priceUsd)}</span>
                <span className="text-white/50">{unlimitedMonthly.period}</span>
              </div>
              <p className="text-xs font-semibold mt-1 text-olo">{unlimitedMonthly.saveNote}</p>
              <Link
                to="/register"
                className="mt-6 block text-center font-semibold px-6 py-3 sm:py-3.5 rounded-2xl transition-all hover:scale-105 bg-olo text-white olo-glow"
              >
                {unlimitedMonthly.cta}
              </Link>
              <ul className="mt-6 space-y-2.5">
                {unlimitedMonthly.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-olo" />
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        {/* Family pack — 15 scans */}
        <Reveal className="mb-8 sm:mb-10">
          <div className="relative p-5 sm:p-7 rounded-2xl sm:rounded-3xl border-2 border-olo/40 bg-olo-deep text-white olo-glow overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-olo/25 rounded-full blur-[80px]" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-olo" />
                  <h3 className="font-heading font-600 text-xl sm:text-2xl">Family pack</h3>
                </div>
                <p className="text-sm text-white/70 mb-3">{FAMILY.scans} scans to split across your household. Transfer scans to anyone by username.</p>
                <ul className="space-y-1.5 text-sm text-white/85">
                  <li className="flex items-start gap-2.5"><span className="text-olo">✓</span> {FAMILY.scans} shareable AI scans</li>
                  <li className="flex items-start gap-2.5"><span className="text-olo">✓</span> Full analysis and braces check for everyone</li>
                  <li className="flex items-start gap-2.5"><span className="text-olo">✓</span> Scans never expire</li>
                </ul>
              </div>
              <div className="text-center sm:text-right flex-shrink-0">
                <div className="flex items-baseline gap-1 justify-center sm:justify-end">
                  <span className="font-heading font-800 text-4xl sm:text-5xl">{format(FAMILY.price)}</span>
                </div>
                <p className="text-xs text-white/50 mb-3">one time · {FAMILY.scans} scans</p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-2xl hover:scale-105 transition-transform olo-glow"
                >
                  Get Family pack
                </Link>
              </div>
            </div>
          </div>
        </Reveal>

        {/* View all pricing */}
        <Reveal className="text-center">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-olo hover:gap-2.5 transition-all"
          >
            View all pricing <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}