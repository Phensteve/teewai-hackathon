import { Check, BadgePercent, Crown, Infinity as InfinityIcon, Users } from 'lucide-react';
import SmartCTA from './SmartCTA';
import StickyCurrencySwitcher from '@/components/StickyCurrencySwitcher';
import { useCurrency } from '@/hooks/use-currency';
import { MONTHLY, YEARLY, YEARLY_MONTHLY_EQ, MONTHLY_YEARLY, MONTHLY_SAVE_PCT, FAMILY, FAMILY_PRO } from '@/lib/payment';

// Real saving from paying yearly instead of recharging month by month.
const SAVE_PCT = Math.round((1 - YEARLY / MONTHLY_YEARLY) * 100);

const SMALL_TIERS = [
  { name: 'Free', priceUsd: 0, per: 'forever', desc: 'Try teewai with a couple of scans.', features: ['2 AI scans', 'Whiteness score & shade', 'Basic recommendations'], cta: 'Start free' },
  { name: 'Packs', priceUsd: 0.99, per: '/pack', prefix: 'From ', desc: 'Buy scans in bundles — no subscription.', features: ['2, 15 or 30 scan packs', 'or pick your own number of scans', 'Full analysis per scan', 'No recurring billing'], cta: 'Buy scans' },
];

const FAQS = [
  { q: 'Is teewai a medical device?', a: 'No. teewai is a wellness companion \u2014 it guides your cosmetic whitening journey. Always see your dentist for clinical concerns, checkups, and diagnosis.' },
  { q: 'Can teewai replace my dentist?', a: 'Never. Think of teewai as the thing that watches your smile between visits. Your dentist does the real work; teewai keeps you honest in between.' },
  { q: 'How does teewai score my teeth?', a: 'teewai\u2019s vision engine maps each tooth in your photo, measures brightness and shade against the VITA Classical scale (the same one dentists use), and checks for stains, plaque, and enamel wear. The result is a 0\u2013100 whiteness score, broken down per tooth.' },
  { q: 'How accurate is the shade reading?', a: 'Best results come with a white index card or VITA shade tab in frame \u2014 teewai calibrates against it as a color reference. No reference? teewai still works, but good natural lighting matters.' },
  { q: 'Is my photo private?', a: 'Yes. Your scans are encrypted and tied to your account alone. You can delete any scan or your entire history at any time. We never sell your photos and never use them to train models.' },
  { q: 'Why might teewai ask for another photo?', a: 'If the image is blurry, poorly lit, or doesn\u2019t show all your teeth (like the top arch), teewai will tell you exactly what to fix and request a retake \u2014 so you never waste a scan on a bad photo.' },
];

export default function HomeTestClosing() {
  const { format } = useCurrency();

  return (
    <>
      <section id="pricing" className="relative px-4 py-24 sm:py-32">
        <div className="max-w-6xl mx-auto">
          <div data-reveal className="text-center mb-10">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf] font-semibold">What it costs</span>
            <h2 className="font-heading font-300 text-3xl sm:text-5xl tracking-tight mt-3">Honest <span className="font-600 text-[#5eead4]">pricing</span></h2>
          </div>
          <StickyCurrencySwitcher sectionId="pricing" topClassName="top-[84px]" dark />

          {/* Free + Packs — smaller cards */}
          <div data-reveal className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto mb-6">
            {SMALL_TIERS.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl border border-white/[0.06] bg-[#06121a] hover:border-white/15 transition-colors">
                <h3 className="font-heading font-500 text-lg text-white mb-1">{t.name}</h3>
                <p className="text-xs text-white/65 mb-4">{t.desc}</p>
                <div className="flex items-baseline gap-1 mb-4">
                  {t.prefix && <span className="text-sm text-white/65">{t.prefix}</span>}
                  <span className="font-heading font-600 text-2xl tracking-tight text-white">{format(t.priceUsd)}</span>
                  <span className="text-sm text-white/65">{t.per}</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/65 font-light"><Check className="w-4 h-4 text-[#2dd4bf] flex-shrink-0" /> {f}</li>
                  ))}
                </ul>
                <SmartCTA className="block w-full py-2.5 text-center text-xs font-bold uppercase tracking-widest rounded-xl border border-white/15 text-white hover:bg-white/5 transition-colors">{t.cta}</SmartCTA>
              </div>
            ))}
          </div>

          {/* Pro + Yearly — premium side-by-side */}
          <div data-reveal className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto items-stretch">
            {/* Pro — Most popular */}
            <div
              className="relative p-8 rounded-2xl border border-[#0d9f8e]/55 flex flex-col"
              style={{
                background: 'linear-gradient(165deg, rgba(13,159,142,0.22), rgba(8,58,58,0.55) 55%, rgba(6,18,26,0.9))',
                boxShadow: '0 0 70px -18px rgba(13,159,142,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <div className="absolute top-4 right-4 bg-[#0d9f8e] text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-3 rounded-full z-10">Most popular</div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading font-500 text-xl text-white">Pro</h3>
                <Crown className="w-5 h-5 text-[#2dd4bf]" />
              </div>
              <p className="text-xs text-white/65 mb-5">Unlimited scanning</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading font-700 text-4xl tracking-tight text-white">{format(MONTHLY)}</span>
                <span className="text-sm text-white/65">/month</span>
              </div>
              <p className="text-xs text-[#5eead4] font-semibold mb-1">Save {MONTHLY_SAVE_PCT}% vs paying per scan</p>
              <p className="text-xs text-white/60 mb-5">Cancel anytime · billed monthly</p>
              <ul className="space-y-3 mb-7 flex-1">
                {['\u221e Unlimited scans', 'Per-tooth analysis', 'Personalized whitening plan', 'Gamified streaks & leaderboard'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/75 font-light"><Check className="w-4 h-4 text-[#2dd4bf] flex-shrink-0" /> {f}</li>
                ))}
              </ul>
              <SmartCTA className="block w-full py-3 text-center text-xs font-bold uppercase tracking-widest rounded-xl bg-[#0d9f8e] text-white hover:bg-[#16c2a6] transition-colors">Go Pro</SmartCTA>
            </div>

            {/* Yearly */}
            <div className="relative p-8 rounded-2xl border border-[#0d9f8e]/40 bg-[#06121a] flex flex-col" style={{ boxShadow: '0 0 50px -12px rgba(13,159,142,0.3)' }}>
              <div className="absolute top-4 right-4 bg-[#0d9f8e] text-white text-xs font-semibold py-1.5 px-3 rounded-full flex items-center gap-1 z-10">
                <BadgePercent className="w-3 h-3" /> Save {SAVE_PCT}%
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading font-500 text-xl text-white">Unlimited Yearly</h3>
                <InfinityIcon className="w-5 h-5 text-[#2dd4bf]" />
              </div>
              <p className="text-xs text-white/65 mb-5">Save {SAVE_PCT}% vs recharging monthly</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading font-700 text-4xl tracking-tight text-white">{format(YEARLY)}</span>
                <span className="text-sm text-white/65">/year</span>
              </div>
              <p className="text-xs text-white/50 mb-5">≈ {format(YEARLY_MONTHLY_EQ)}/mo billed annually</p>
              <ul className="space-y-3 mb-7 flex-1">
                {['Everything in Unlimited', `${SAVE_PCT}% discount`, 'Billed annually', '2 months free'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/75 font-light"><Check className="w-4 h-4 text-[#2dd4bf] flex-shrink-0" /> {f}</li>
                ))}
              </ul>
              <SmartCTA className="block w-full py-3 text-center text-xs font-bold uppercase tracking-widest rounded-xl border border-[#0d9f8e]/50 text-[#5eead4] hover:bg-[#0d9f8e]/10 transition-colors">Choose yearly</SmartCTA>
            </div>
          </div>

          {/* Family pack + Family unlimited */}
          <div data-reveal className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto items-stretch mt-5">
            {/* Family pack */}
            <div className="relative p-8 rounded-2xl border border-[#0d9f8e]/40 bg-[#06121a] flex flex-col" style={{ boxShadow: '0 0 50px -12px rgba(13,159,142,0.3)' }}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading font-500 text-xl text-white">Family pack</h3>
                <Users className="w-5 h-5 text-[#2dd4bf]" />
                <span className="text-[10px] font-bold text-[#06121a] bg-[#5eead4] px-2 py-1 rounded-full">5 members</span>
              </div>
              <p className="text-xs text-white/65 mb-5">{FAMILY.desc} — transfer scans to anyone by username.</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading font-700 text-4xl tracking-tight text-white">{format(FAMILY.price)}</span>
                <span className="text-sm text-white/65">one-time</span>
              </div>
              <p className="text-xs text-white/50 mb-5">{FAMILY.scans} scans · {format(+(FAMILY.price / FAMILY.scans).toFixed(2))}/scan</p>
              <ul className="space-y-3 mb-7 flex-1">
                {['75 shareable AI scans', 'Full analysis + braces check for everyone', 'Transfer scans to family by username', 'Scans never expire'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/75 font-light"><Check className="w-4 h-4 text-[#2dd4bf] flex-shrink-0" /> {f}</li>
                ))}
              </ul>
              <SmartCTA className="block w-full py-3 text-center text-xs font-bold uppercase tracking-widest rounded-xl border border-[#0d9f8e]/50 text-[#5eead4] hover:bg-[#0d9f8e]/10 transition-colors">Get family pack</SmartCTA>
            </div>

            {/* Family unlimited */}
            <div className="relative p-8 rounded-2xl border border-[#0d9f8e]/55 flex flex-col" style={{ background: 'linear-gradient(165deg, rgba(13,159,142,0.22), rgba(8,58,58,0.55) 55%, rgba(6,18,26,0.9))', boxShadow: '0 0 70px -18px rgba(13,159,142,0.55), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading font-500 text-xl text-white">Family Unlimited</h3>
                <Users className="w-5 h-5 text-[#2dd4bf]" />
                <span className="text-[10px] font-bold text-[#06121a] bg-[#5eead4] px-2 py-1 rounded-full">5 members</span>
              </div>
              <p className="text-xs text-white/65 mb-5">Unlimited scanning for a family of 5.</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading font-700 text-4xl tracking-tight text-white">{format(FAMILY_PRO)}</span>
                <span className="text-sm text-white/65">/month</span>
              </div>
              <p className="text-xs text-white/60 mb-5">Cancel anytime · billed monthly</p>
              <ul className="space-y-3 mb-7 flex-1">
                {['Unlimited scans for 5 family members', 'Full analysis + braces check for everyone', "Kids' reports emailed to parents", 'Each member gets their own scans'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/75 font-light"><Check className="w-4 h-4 text-[#2dd4bf] flex-shrink-0" /> {f}</li>
                ))}
              </ul>
              <SmartCTA className="block w-full py-3 text-center text-xs font-bold uppercase tracking-widest rounded-xl bg-[#0d9f8e] text-white hover:bg-[#16c2a6] transition-colors">Get family unlimited</SmartCTA>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="relative px-4 py-24 sm:py-28">
        <div className="max-w-3xl mx-auto">
          <div data-reveal className="text-center mb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf] font-semibold">FAQ</span>
            <h2 className="font-heading font-300 text-3xl sm:text-4xl tracking-tight mt-3">Good to know</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <div key={f.q} data-reveal className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.04]">
                <h3 className="font-heading font-500 text-base text-white mb-2">{f.q}</h3>
                <p className="text-sm text-white/70 leading-relaxed font-light">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}