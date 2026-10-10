import { Check, BadgePercent, Infinity as InfinityIcon, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/use-currency';
import StickyCurrencySwitcher from '@/components/StickyCurrencySwitcher';
import { PACKS, FAMILY, FAMILY_PRO, MONTHLY, YEARLY, YEARLY_MONTHLY_EQ } from '@/lib/payment';

// Dark-themed pricing section for the hometest landing. Mirrors LandingPricing
// but uses the hometest's deep-teal palette so it blends with the 3D page.
const subscriptions = [
  {
    name: 'Unlimited',
    priceUsd: MONTHLY,
    period: '/month',
    desc: 'Unlimited scanning',
    features: ['Unlimited scans', 'Full AI analysis', 'All craving features', 'Priority AI', 'Unlimited history'],
    cta: 'Go Unlimited',
    highlight: true,
    saveNote: 'Save 14% vs paying per scan',
  },
  {
    name: 'Unlimited Yearly',
    priceUsd: YEARLY,
    period: '/year',
    subUsd: YEARLY_MONTHLY_EQ,
    desc: 'Save 16% vs monthly',
    features: ['Everything in Unlimited', '16% discount', 'Billed annually', '2 months free'],
    cta: 'Choose yearly',
    badge: 'Save 16%',
  },
];

export default function HomeTestPricing() {
  const { format } = useCurrency();
  return (
    <section id="pricing" className="relative px-4 py-24 sm:py-32">
      <div className="max-w-5xl mx-auto">
        <div data-reveal className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf] font-semibold">Pricing</span>
          <h2 className="mt-3 font-heading font-300 text-3xl sm:text-5xl tracking-tight">
            Scan packs or go <span className="font-600 text-[#5eead4]">unlimited</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-white/60 leading-relaxed">
            Pay per pack, or unlock unlimited scanning. Your first 5 scans are free — no credit card needed. Cancel anytime.
          </p>
        </div>

        <StickyCurrencySwitcher dark topClassName="top-[calc(5.5rem+env(safe-area-inset-top))] lg:top-[5.5rem]" />

        {/* Scan packs */}
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-10">
          {PACKS.map((p, i) => (
            <div
              key={p.id}
              data-reveal
              style={{ transitionDelay: `${i * 90}ms` }}
              className="relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.03] hover:border-[#0d9f8e]/50 transition-all duration-300 h-full"
            >
              <h3 className="font-heading font-600 text-xl sm:text-2xl text-white">{p.name}</h3>
              <p className="text-sm text-white/50 mt-1">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-heading font-800 text-3xl sm:text-4xl text-white">{format(p.price)}</span>
                <span className="text-white/40 text-sm">/ {p.scans} scans</span>
              </div>
              <Link
                to="/dashboard"
                className="mt-6 block text-center font-semibold px-6 py-3 rounded-2xl transition-all hover:scale-105 bg-[#0d9f8e]/15 text-[#5eead4] hover:bg-[#0d9f8e]/25"
              >
                Get {p.name}
              </Link>
              <ul className="mt-6 space-y-2.5">
                <li className="flex items-start gap-3 text-sm text-white/70"><Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#2dd4bf]" /> {p.scans} AI scans</li>
                <li className="flex items-start gap-3 text-sm text-white/70"><Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#2dd4bf]" /> Whiteness + health score</li>
                <li className="flex items-start gap-3 text-sm text-white/70"><Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#2dd4bf]" /> Shade detection</li>
              </ul>
            </div>
          ))}
        </div>

        {/* Unlimited subscriptions — individual flagship, shown before family */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto mb-10">
          {subscriptions.map((p, i) => (
            <div
              key={p.name}
              data-reveal
              style={{ transitionDelay: `${i * 90}ms` }}
              className={`relative p-5 sm:p-7 rounded-2xl sm:rounded-3xl border transition-all duration-300 h-full ${
                p.highlight
                  ? 'border-[#0d9f8e] bg-[#0a1f24] scale-[1.02]'
                  : 'border-white/10 bg-white/[0.03] hover:border-[#0d9f8e]/50'
              }`}
            >
              {p.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0d9f8e] text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-1">
                  <BadgePercent className="w-3 h-3" /> {p.badge}
                </div>
              )}
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-600 text-xl sm:text-2xl text-white">{p.name}</h3>
                {p.highlight && <InfinityIcon className="w-5 h-5 text-[#5eead4]" />}
              </div>
              <p className="text-sm mt-1 text-white/50">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-heading font-800 text-4xl sm:text-5xl text-white">{format(p.priceUsd)}</span>
                <span className="text-white/40">{p.period}</span>
              </div>
              {p.subUsd && <p className="text-xs mt-1 text-white/40">≈ {format(p.subUsd)}/mo billed annually</p>}
              {p.saveNote && <p className="text-xs font-semibold mt-1 text-[#5eead4]">{p.saveNote}</p>}
              <Link
                to="/dashboard"
                className={`mt-6 block text-center font-semibold px-6 py-3 sm:py-3.5 rounded-2xl transition-all hover:scale-105 ${
                  p.highlight ? 'bg-[#0d9f8e] text-white' : 'bg-[#0d9f8e]/15 text-[#5eead4] hover:bg-[#0d9f8e]/25'
                }`}
              >
                {p.cta}
              </Link>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                    <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#2dd4bf]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Family pack */}
        <div data-reveal className="mb-10 relative p-5 sm:p-7 rounded-2xl sm:rounded-3xl border-2 border-[#0d9f8e]/40 bg-[#0a1f24] overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#0d9f8e]/25 rounded-full blur-[80px]" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-[#5eead4]" />
                <h3 className="font-heading font-600 text-xl sm:text-2xl text-white">Family pack</h3>
                <span className="text-[10px] font-bold text-[#06121a] bg-[#5eead4] px-2 py-1 rounded-full">5 members</span>
              </div>
              <p className="text-sm text-white/60 mb-3">{FAMILY.desc} — transfer scans to anyone by username.</p>
              <ul className="space-y-1.5 text-sm text-white/80">
                <li className="flex items-start gap-2.5"><span className="text-[#5eead4]">✓</span> {FAMILY.scans} shareable AI scans</li>
                <li className="flex items-start gap-2.5"><span className="text-[#5eead4]">✓</span> Full analysis + braces check for everyone</li>
                <li className="flex items-start gap-2.5"><span className="text-[#5eead4]">✓</span> Scans never expire</li>
              </ul>
            </div>
            <div className="text-center sm:text-right flex-shrink-0">
              <div className="flex items-baseline gap-1 justify-center sm:justify-end">
                <span className="font-heading font-800 text-4xl sm:text-5xl text-white">{format(FAMILY.price)}</span>
              </div>
              <p className="text-xs text-white/40 mb-3">one-time · {FAMILY.scans} scans</p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 bg-[#0d9f8e] text-white font-semibold px-6 py-3 rounded-2xl hover:scale-105 transition-transform" style={{ boxShadow: '0 0 40px -10px rgba(13,159,142,0.6)' }}>
                Get Family pack
              </Link>
            </div>
          </div>
        </div>

        {/* Family Unlimited */}
        <div data-reveal className="mb-10 relative p-5 sm:p-7 rounded-2xl sm:rounded-3xl border-2 border-[#0d9f8e]/50 bg-gradient-to-br from-[#0a1f24] to-[#062a30] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0d9f8e] to-transparent" />
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-[#0d9f8e]/20 rounded-full blur-[80px]" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-[#5eead4]" />
                <h3 className="font-heading font-600 text-xl sm:text-2xl text-white">Family Unlimited</h3>
                <span className="text-[10px] font-bold text-[#06121a] bg-[#5eead4] px-2 py-1 rounded-full">5 members</span>
              </div>
              <p className="text-sm text-white/60 mb-3">Unlimited scanning for a family of 5. Each member gets their own unlimited scans, and parents receive kids' scan reports by email.</p>
              <ul className="space-y-1.5 text-sm text-white/80">
                <li className="flex items-start gap-2.5"><span className="text-[#5eead4]">✓</span> Unlimited scans for 5 family members</li>
                <li className="flex items-start gap-2.5"><span className="text-[#5eead4]">✓</span> Full analysis + braces check for everyone</li>
                <li className="flex items-start gap-2.5"><span className="text-[#5eead4]">✓</span> Kids' reports emailed to parents</li>
              </ul>
            </div>
            <div className="text-center sm:text-right flex-shrink-0">
              <div className="flex items-baseline gap-1 justify-center sm:justify-end">
                <span className="font-heading font-800 text-4xl sm:text-5xl text-white">{format(FAMILY_PRO)}</span>
                <span className="text-white/40">/month</span>
              </div>
              <p className="text-xs text-white/30 mb-3">billed monthly · cancel anytime</p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 bg-[#0d9f8e] text-white font-semibold px-6 py-3 rounded-2xl hover:scale-105 transition-transform" style={{ boxShadow: '0 0 50px -10px rgba(13,159,142,0.7)' }}>
                Get Family Unlimited
              </Link>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
}