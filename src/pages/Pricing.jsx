import { Link } from 'react-router-dom';
import { Check, BadgePercent, Infinity as InfinityIcon, Users, ArrowLeft } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import StickyCurrencySwitcher from '@/components/StickyCurrencySwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import { FAMILY, FAMILY_PRO } from '@/lib/payment';

const packs = [
  {
    name: 'Daily',
    priceUsd: 0.067,
    scanCount: 1,
    scans: '1 scan',
    desc: '1 scan · expires in 24h',
    cta: 'Get Daily',
    expiryDays: 1,
    referralEligible: true,
  },
  {
    name: 'Starter',
    priceUsd: 0.99,
    scanCount: 5,
    scans: '5 scans',
    desc: 'Try teewai out',
    cta: 'Get Starter',
  },
  {
    name: 'Plus',
    priceUsd: 4.58,
    scanCount: 25,
    scans: '25 scans',
    desc: 'Track a whitening cycle',
    cta: 'Get Plus',
  },
  {
    name: 'Boost',
    priceUsd: 9.99,
    scanCount: 60,
    scans: '60 scans',
    desc: 'Best-value pack',
    cta: 'Get Boost',
  },
];

const subscriptions = [
  {
    name: 'Unlimited',
    priceUsd: 24.99,
    period: '/month',
    desc: 'Unlimited scanning',
    features: [],
    cta: 'Go Unlimited',
    highlight: true,
    saveNote: 'Save 14% vs paying per scan',
  },
  {
    name: 'Unlimited Weekly',
    priceUsd: 8.0,
    period: '/week',
    desc: '7 days of unlimited scanning',
    features: ['Unlimited scans for 7 days', 'Cancel anytime', 'Rollover grace: 1 day'],
    cta: 'Go Weekly',
    badge: 'New',
  },
  {
    name: 'Unlimited Yearly',
    priceUsd: 251.95,
    period: '/year',
    subUsd: 21.00,
    desc: 'Save 16% vs monthly',
    features: ['Everything in Unlimited', '16% discount', 'Billed annually', '2 months free'],
    cta: 'Choose yearly',
    badge: 'Save 16%',
  },
];

function PackCard({ p, format }) {
  return (
    <div className="relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border bg-card hover:border-olo/40 transition-all duration-300 h-full">
      <h3 className="font-heading font-600 text-xl sm:text-2xl">{p.name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-heading font-800 text-3xl sm:text-4xl">{format(p.priceUsd)}</span>
        <span className="text-muted-foreground text-sm">/ {p.scans}</span>
      </div>
      {p.scanCount && (
        <p className="text-xs text-muted-foreground mt-1">≈ {format(p.priceUsd / p.scanCount)} per scan</p>
      )}
      <Link
        to="/dashboard"
        className="mt-6 block text-center font-semibold px-6 py-3 rounded-2xl transition-all hover:scale-105 bg-olo/10 text-olo hover:bg-olo/20"
      >
        {p.cta}
      </Link>
    </div>
  );
}

function SubCard({ p, format }) {
  return (
    <div
      className={`relative p-5 sm:p-7 rounded-2xl sm:rounded-3xl border transition-all duration-300 h-full ${
        p.highlight ? 'border-olo bg-card' : 'border-border bg-card hover:border-olo/40'
      }`}
    >
      {p.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-olo text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-1">
          <BadgePercent className="w-3 h-3" /> {p.badge}
        </div>
      )}
      {p.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-olo text-white text-xs font-semibold px-4 py-1.5 rounded-full">
          Most popular
        </div>
      )}
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-600 text-xl sm:text-2xl">{p.name}</h3>
        {p.highlight && <InfinityIcon className="w-5 h-5 text-olo" />}
      </div>
      <p className="text-sm mt-1 text-muted-foreground">{p.desc}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-heading font-800 text-4xl sm:text-5xl">{format(p.priceUsd)}</span>
        <span className="text-muted-foreground">{p.period}</span>
      </div>
      {p.subUsd && (
        <p className="text-xs mt-1 text-muted-foreground">≈ {format(p.subUsd)}/mo billed annually</p>
      )}
      {p.saveNote && (
        <p className="text-xs font-semibold mt-1 text-olo">{p.saveNote}</p>
      )}
      <Link
        to="/dashboard"
        className={`mt-6 block text-center font-semibold px-6 py-3 sm:py-3.5 rounded-2xl transition-all hover:scale-105 ${
          p.highlight ? 'bg-olo text-white' : 'bg-olo/10 text-olo hover:bg-olo/20'
        }`}
      >
        {p.cta}
      </Link>
      <ul className="mt-6 space-y-2.5">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm">
            <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-olo" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Pricing() {
  const { format } = useCurrency();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border safe-area-inset-top">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-heading font-700 text-lg tracking-tight">teewai</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-olo transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h1 className="font-heading font-700 text-3xl sm:text-4xl tracking-tight">All teewai plans</h1>
          <p className="mt-4 text-sm sm:text-lg text-muted-foreground text-balance">
            Pay per pack or go unlimited. Your first 5 scans are free. Scan packs expire after 30 days (daily scan after 24 hours). No credit card needed. Cancel anytime.
          </p>
        </div>

        <StickyCurrencySwitcher topClassName="top-16" />

        {/* Scan packs */}
        <h2 className="font-heading font-600 text-xl sm:text-2xl mb-4 mt-2">Scan packs</h2>
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-14">
          {packs.map((p) => (
            <PackCard key={p.name} p={p} format={format} />
          ))}
        </div>

        {/* Subscriptions */}
        <h2 className="font-heading font-600 text-xl sm:text-2xl mb-4">Unlimited subscriptions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mb-10 sm:mb-14">
          {subscriptions.map((p) => (
            <SubCard key={p.name} p={p} format={format} />
          ))}
        </div>

        {/* Family */}
        <h2 className="font-heading font-600 text-xl sm:text-2xl mb-4">Family</h2>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl">
          {/* Family pack */}
          <div className="relative p-5 sm:p-7 rounded-2xl sm:rounded-3xl border-2 border-olo/30 bg-card overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-olo" />
              <h3 className="font-heading font-600 text-xl sm:text-2xl">Family pack</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {FAMILY.scans} scans to split across your household. Transfer scans to anyone by username.
            </p>
            <ul className="space-y-1.5 text-sm mb-5">
              <li className="flex items-start gap-2.5"><span className="text-olo">✓</span> {FAMILY.scans} shareable AI scans</li>
              <li className="flex items-start gap-2.5"><span className="text-olo">✓</span> Full analysis and braces check for everyone</li>
              <li className="flex items-start gap-2.5"><span className="text-olo">✓</span> Scans expire after 30 days</li>
            </ul>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="font-heading font-800 text-3xl sm:text-4xl">{format(FAMILY.price)}</span>
              <span className="text-muted-foreground text-xs">one-time · {FAMILY.scans} scans</span>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-2xl hover:scale-105 transition-transform"
            >
              Get Family pack
            </Link>
          </div>

          {/* Family Unlimited */}
          <div className="relative p-5 sm:p-7 rounded-2xl sm:rounded-3xl border-2 border-olo/40 bg-card overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-olo" />
              <h3 className="font-heading font-600 text-xl sm:text-2xl">Family Unlimited</h3>
              <span className="text-[10px] font-bold text-white bg-olo px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">5 members</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Unlimited scanning for a family of 5. Each member gets their own unlimited scans, and parents receive kids' scan reports by email.
            </p>
            <ul className="space-y-1.5 text-sm mb-5">
              <li className="flex items-start gap-2.5"><span className="text-olo">✓</span> Unlimited scans for 5 family members</li>
              <li className="flex items-start gap-2.5"><span className="text-olo">✓</span> Full analysis and braces check for everyone</li>
              <li className="flex items-start gap-2.5"><span className="text-olo">✓</span> Kids' reports emailed to parents</li>
            </ul>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="font-heading font-800 text-3xl sm:text-4xl">{format(FAMILY_PRO)}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">billed monthly · cancel anytime</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-2xl hover:scale-105 transition-transform"
            >
              Get Family Unlimited
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}