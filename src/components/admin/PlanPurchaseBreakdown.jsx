import { useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';

const PLAN_LABEL = {
  free: 'Free',
  pack_2: '2-pack',
  pack_15: '15-pack',
  pack_30: '30-pack',
  family_15: 'Family',
  pro: 'Pro',
  pro_yearly: 'Pro yearly',
  pro_weekly: 'Pro weekly',
  family_pro: 'Family Pro',
  family_extra_member: 'Family extra member',
  custom: 'Custom bundle',
};

const PLAN_PRICE = {
  pack_2: 0.99, pack_15: 4.58, pack_30: 9.99, family_15: 20.99,
  pro: 49.99, pro_yearly: 503.9, pro_weekly: 16.0, family_pro: 199.9,
};

// Groups purchases by plan/pack and ranks them by count + revenue.
// Shows which plans/packs are bought most, so the admin can see what's selling.
export default function PlanPurchaseBreakdown({ revenueEvents = [] }) {
  const rows = useMemo(() => {
    const map = {};
    for (const e of revenueEvents) {
      const plan = e.plan || 'unknown';
      if (!map[plan]) map[plan] = { plan, count: 0, revenue: 0 };
      map[plan].count += 1;
      map[plan].revenue += Number(e.amount_usd) || 0;
    }
    // Exclude free from the ranking — it's not a purchase.
    const paid = Object.values(map).filter((r) => r.plan !== 'free' && r.plan !== 'unknown');
    return paid.sort((a, b) => b.count - a.count || b.revenue - a.revenue);
  }, [revenueEvents]);

  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const totalPurchases = rows.reduce((s, r) => s + r.count, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  if (!rows.length) {
    return (
      <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-lg">Plan & pack purchases</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-3">No purchases recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-lg">Plan & pack purchases</h2>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span><span className="font-semibold text-foreground">{totalPurchases}</span> purchases</span>
          <span><span className="font-semibold text-foreground">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> revenue</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {rows.map((r, i) => {
          const label = PLAN_LABEL[r.plan] || r.plan;
          const pct = (r.count / maxCount) * 100;
          const revenuePct = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;
          const isTop = i === 0;
          return (
            <div key={r.plan} className="relative">
              <div className="flex items-center gap-3">
                <span className={`w-6 text-xs font-semibold ${isTop ? 'text-olo' : 'text-muted-foreground'}`}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${isTop ? 'text-olo' : 'text-foreground'}`}>
                      {label}{isTop && <span className="ml-1.5 text-[10px] uppercase tracking-wider text-olo/70">top seller</span>}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold text-foreground">{r.count}×</span>
                      <span className="text-muted-foreground">${r.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      {PLAN_PRICE[r.plan] && (
                        <span className="text-muted-foreground/60 hidden sm:inline">${PLAN_PRICE[r.plan]} each</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isTop ? 'bg-olo' : 'bg-olo/50'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5 text-[10px] text-muted-foreground/70">
                    <span>{((r.count / totalPurchases) * 100).toFixed(0)}% of purchases</span>
                    <span>{revenuePct.toFixed(0)}% of revenue</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}