import { Link } from 'react-router-dom';
import { Crown, ArrowRight, Check } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';

// Shown on the referral page for users with no active paid plan. A compact,
// sleek plan explorer that gets them to a paid plan so their referral code
// activates. Only the referral-eligible entry points are surfaced — the full
// pricing page has the complete catalog.
const PLANS = [
  { name: 'Daily', priceUsd: 0.067, period: '/day', desc: '1 scan · 24h', tag: 'Lowest entry' },
  { name: 'Plus', priceUsd: 4.58, period: '', desc: '25 scans', tag: 'Track a cycle' },
  { name: 'Boost', priceUsd: 9.99, period: '', desc: '60 scans', tag: 'Best value', highlight: true },
  { name: 'Unlimited', priceUsd: 24.99, period: '/mo', desc: 'Unlimited scanning', tag: 'Most popular' },
];

export default function ExplorePlansCard() {
  const { format } = useCurrency();
  return (
    <div className="mb-6 rounded-3xl border border-warning/30 bg-warning-soft/40 overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 flex items-start gap-3 border-b border-warning/20">
        <div className="w-11 h-11 rounded-2xl bg-warning/15 text-warning flex items-center justify-center flex-shrink-0">
          <Crown className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-heading font-700 text-base sm:text-lg">Unlock referrals with a paid plan</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your referral code activates the moment you subscribe. Earn ₦50 for every friend who scans.
          </p>
        </div>
      </div>

      {/* Plan grid */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative p-4 rounded-2xl border flex flex-col ${
              p.highlight ? 'border-olo bg-olo/5' : 'border-border bg-card'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-heading font-700 text-sm">{p.name}</p>
              {p.tag && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  p.highlight ? 'bg-olo text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {p.tag}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-heading font-800 text-xl">{format(p.priceUsd)}</span>
              {p.period && <span className="text-xs text-muted-foreground">{p.period}</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-4 sm:px-5 pb-5">
        <Link
          to="/pricing"
          className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-2xl hover:scale-[1.01] transition-transform olo-glow"
        >
          Explore all plans <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Check className="w-3 h-3 text-olo" /> First 5 scans free</span>
          <span className="inline-flex items-center gap-1"><Check className="w-3 h-3 text-olo" /> Cancel anytime</span>
        </div>
      </div>
    </div>
  );
}