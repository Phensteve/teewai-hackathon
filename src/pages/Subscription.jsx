import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { subscriptions, coupons as insforgeCoupons } from '@/lib/insforgeDb';
import { getCachedSubscription, setCachedSubscription } from '@/lib/subscriptionCache';
import { useCurrency } from '@/hooks/use-currency';
import StickyCurrencySwitcher from '@/components/StickyCurrencySwitcher';
import { Crown, Loader2, Infinity as InfinityIcon, ArrowRight, Minus, Plus, History, ScanLine, Tag, X, Users, Lock, ArrowLeftRight, WifiOff, RotateCcw } from 'lucide-react';
import StripeLogo from '@/components/StripeLogo';
import PaystackTrustNote from '@/components/PaystackTrustNote';
import PageSkeleton from '@/components/loading/PageSkeleton';
import TransferScans from '@/components/TransferScans';
import { FREE_SCANS, SCAN_PRICE, MONTHLY, YEARLY, WEEKLY, YEARLY_MONTHLY_EQ, MONTHLY_YEARLY, SAVINGS, MONTHLY_SAVE_PCT, PACKS, PLAN_LABELS, FAMILY, FAMILY_PRO, PACK_EXPIRY_DAYS, rolloverDeadline, computeFirst50Bonus, buildPurchasePayload, getEarlyAdopter } from '@/lib/payment';

export default function Subscription() {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [customCount, setCustomCount] = useState(10);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [earlyAdopter, setEarlyAdopter] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [familyMembership, setFamilyMembership] = useState(null);

  const load = async () => {
    // Render instantly from the in-memory cache (warmed by AppShell on login),
    // then refresh in the background — no spinner on re-entry.
    const cached = getCachedSubscription();
    if (cached) {
      setSubscription(cached);
      setLoading(false);
    }
    const existing = await subscriptions.filter({});
    let sub;
    if (existing[0]) {
      sub = existing[0];
    } else {
      // New users start with five free scans.
      sub = await subscriptions.create({
        plan: 'free', status: 'active', scans_limit: FREE_SCANS, scans_used: 0, purchases: [],
      });
    }
    setSubscription(sub);
    setCachedSubscription(sub);
    const early = await getEarlyAdopter();
    setEarlyAdopter(early);
    reconcilePurchases(sub, early);
  };

  // Reconcile against the user's real Paystack history: record any paid
  // purchases that verification missed. Throttled to once / 10 min.
  const reconcilePurchases = async (current, early) => {
    if (!current) return;
    try {
      const last = Number(sessionStorage.getItem('teewai_sync_at') || 0);
      if (Date.now() - last < 10 * 60 * 1000) return;
      sessionStorage.setItem('teewai_sync_at', String(Date.now()));
      setSyncing(true);
      const syncRes = await unrufld.functions.invoke('paystack', { action: 'syncPurchases' });
      setSyncing(false);
      const txns = syncRes.data?.transactions || [];
      if (!txns.length) return;
      const existingRefs = new Set((current.purchases || []).map((p) => p.reference));
      const missing = txns.filter((t) => t.plan && !existingRefs.has(t.reference));
      if (!missing.length) return;
      let updated = current;
      for (const t of missing) {
        const bonus = computeFirst50Bonus(t.plan, early, updated.purchases || []);
        updated = { ...updated, ...buildPurchasePayload(updated, t.plan, t.scans || 0, t.reference, t.date, bonus) };
      }
      setSubscription(await subscriptions.update(current.id, updated));
    } catch {
      setSyncing(false);
    }
  };

  useEffect(() => { load().catch(() => setError(true)).finally(() => setLoading(false)); }, []);

  // If this user is a linked family member (not the plan owner), load their
  // personal allocation from the family pool so the scans section shows their
  // own usage — not the owner's subscription or the family total.
  useEffect(() => {
    unrufld.functions.invoke('familyResolve', { op: 'resolve' })
      .then(({ data }) => { if (data?.found) setFamilyMembership(data); })
      .catch(() => {});
  }, []);

  const isFamilyMember = !!familyMembership;
  const isFamilyOwner = !isFamilyMember && (subscription?.plan === 'family_15' || subscription?.plan === 'family_pro');
  const isUnlimited = (!isFamilyMember && (subscription?.plan === 'pro' || subscription?.plan === 'pro_yearly' || subscription?.plan === 'pro_weekly' || subscription?.plan === 'family_pro')) || (isFamilyMember && familyMembership?.plan === 'family_pro');
  // For family plan owners, show only the admin's own scans (tracked in the
  // top-level scans_used), not the family total. The family total lives in
  // the Family dashboard / health ranking section.
  // Family plan owners are member 1 (index 0) — track their personal 15-scan
  // allocation on members[0], not the top-level scans_used (which is never
  // incremented for family plans and would always show 15/15). Leftover pack /
  // free scans (pack_scans_*) are consumed before the family 15, so they're
  // folded into the remaining/used/limit totals here.
  const ownerMember = isFamilyOwner ? (subscription?.members?.[0]) : null;
  const packTotal = Number(subscription?.pack_scans_total || 0);
  const packRemaining = Math.max(0, Number(subscription?.pack_scans_remaining || 0));
  const packUsed = Math.max(0, packTotal - packRemaining);
  const famPackTotal = Number(familyMembership?.pack_scans_total || 0);
  const famPackRemaining = Math.max(0, Number(familyMembership?.pack_scans_remaining || 0));
  const famPackUsed = Math.max(0, famPackTotal - famPackRemaining);
  // Family plan: show only the member's personal allocation (including gifted
  // bonus_scans). The total family plan scans (pack + all members) are shown
  // only on the Family dashboard page, not here.
  const famMemberBonus = Number(familyMembership?.bonus_scans) || 0;
  const ownerBonus = Number(ownerMember?.bonus_scans) || 0;
  const scansUsed = isFamilyMember
    ? (familyMembership.scans_used || 0)
    : isFamilyOwner
      ? (ownerMember?.scans_used || 0)
      : (subscription?.scans_used || 0);
  const scansLimit = isFamilyMember
    ? (familyMembership.scans_limit || 0) + famMemberBonus
    : isFamilyOwner
      ? (ownerMember?.scans_limit || 15) + ownerBonus
      : (subscription?.plan === 'free' || !subscription?.plan) ? Math.max(subscription?.scans_limit || 0, FREE_SCANS) : (subscription?.scans_limit || 0);
  const scansLeft = Math.max(0, scansLimit - scansUsed);
  const purchases = subscription?.purchases || [];

  const goToCheckout = (plan, scans) => {
    navigate('/checkout', { state: { plan, scans, coupon: appliedCoupon } });
  };

  const setCount = (n) => setCustomCount(Math.max(1, Math.min(500, n)));

  const applyCoupon = async () => {
    setCouponMsg('');
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCheckingCoupon(true);
    try {
      const list = await insforgeCoupons.filter({ code });
      const c = list[0];
      if (!c) { setAppliedCoupon(null); setCouponMsg('Coupon not found.'); return; }
      if (c.active === false) { setAppliedCoupon(null); setCouponMsg('That coupon is inactive.'); return; }
      if (c.expires_date && new Date(c.expires_date) < new Date()) { setAppliedCoupon(null); setCouponMsg('That coupon has expired.'); return; }
      if (c.max_uses > 0 && (c.used_count || 0) >= c.max_uses) { setAppliedCoupon(null); setCouponMsg('That coupon has reached its use limit.'); return; }
      setAppliedCoupon({ code, discount_type: c.discount_type, discount_value: c.discount_value });
      setCouponMsg(`Coupon "${code}" applied — ${c.discount_type === 'percent' ? c.discount_value + '% off' : format(c.discount_value) + ' off'} your next purchase.`);
    } catch (e) {
      setCouponMsg(e?.message || 'Could not check coupon.');
    } finally {
      setCheckingCoupon(false);
    }
  };

  if (loading) return <PageSkeleton title="Subscription" />;

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-soft flex items-center justify-center mx-auto mb-5">
          <WifiOff className="w-7 h-7 text-danger" />
        </div>
        <h2 className="font-heading font-700 text-xl mb-2">We couldn't load your subscription</h2>
        <p className="text-sm text-muted-foreground mb-6">Your plan and scans are safe — this is usually a connection hiccup. Check your signal and try again.</p>
        <button onClick={() => { load().catch(() => setError(true)).finally(() => setLoading(false)); setLoading(true); }} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow">
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
          <Crown className="w-7 h-7 text-olo" />
        </div>
        <h1 className="font-heading font-700 text-3xl tracking-tight mb-2">Your subscription</h1>
        <p className="text-muted-foreground">
          {isUnlimited
            ? (isFamilyMember
              ? "You're on Family Unlimited — unlimited scans for your household."
              : `You're on Unlimited. Renews ${subscription?.renewal_date ? new Date(subscription.renewal_date).toLocaleDateString() : 'periodically'}.`)
            : 'Buy scan packs, build your own, or go unlimited. Pick what fits your smile.'}
        </p>
      </div>

      {earlyAdopter?.isEarly && (
        <div className="mb-6 p-5 rounded-2xl border border-olo/30 bg-olo/5 flex items-start gap-3">
          <Crown className="w-5 h-5 text-olo flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading font-700 text-olo">You're teewai user #{earlyAdopter.userNumber} — First 50 club 🎉</p>
            <p className="text-muted-foreground mt-1">
              Your first {Math.max(0, 2 - (subscription?.purchases || []).length)} pack purchases earn bonus scans: <strong>+1 on Starter</strong>, <strong>+2 on Plus</strong>, <strong>+3 on Boost</strong>.
            </p>
          </div>
        </div>
      )}

      {syncing && (
        <div className="mb-6 p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-olo animate-spin" />
          <p className="text-sm text-muted-foreground">Syncing your purchase history…</p>
        </div>
      )}

      {/* Scans remaining */}
      <div className="mb-8 p-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <ScanLine className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-700 text-lg">Scans remaining</h2>
        </div>
        {isUnlimited ? (
          <div className="flex items-center gap-3">
            <InfinityIcon className="w-8 h-8 text-olo" />
            <div>
              <p className="font-heading font-800 text-3xl text-olo">Unlimited</p>
              <p className="text-sm text-muted-foreground">
                {isFamilyMember
                  ? 'Family Unlimited plan — unlimited scans for your household.'
                  : `Renews ${subscription?.renewal_date ? new Date(subscription.renewal_date).toLocaleDateString() : 'periodically'}.`}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-heading font-800 text-4xl">{scansLeft}</span>
              <span className="text-sm text-muted-foreground">of {scansLimit} scans left</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-olo rounded-full transition-all" style={{ width: `${scansLimit ? (scansLeft / scansLimit) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isFamilyMember
                ? `Family plan · your personal scan allocation. Family total is in the Family dashboard.`
                : isFamilyOwner
                  ? 'Family plan · your personal scans. Family total is in the Family dashboard below.'
                  : scansLeft > 0 ? 'New here? You start with 5 free scans.' : 'Out of scans — grab a pack below.'}
            </p>
          </div>
        )}
      </div>

      {/* Rollover notice for unlimited subscribers */}
      {isUnlimited && subscription?.renewal_date && (() => {
        const deadline = rolloverDeadline(subscription);
        if (!deadline) return null;
        return (
          <div className="mb-6 p-4 rounded-2xl border border-olo/20 bg-olo/5 flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-olo flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Rollover before {deadline.toLocaleDateString()} to preserve your scans</p>
              <p className="text-muted-foreground mt-0.5">Renew before this date to carry over unused scans into your next cycle.</p>
            </div>
          </div>
        );
      })()}

      {/* Transfer scans to another user */}
      <div id="transfer-section">
        <TransferScans available={isUnlimited ? 0 : scansLeft} onDone={load} />
      </div>

      {/* Coupon */}
      <div className="mb-8 p-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-1">
          <Tag className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-700 text-xl">Have a coupon?</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Apply a promo code for a discount on your next purchase.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            placeholder="SUMMER25"
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-base uppercase focus:outline-none focus:border-olo"
          />
          <button
            onClick={applyCoupon}
            disabled={checkingCoupon || !couponInput.trim()}
            className="inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-6 py-2.5 rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
          >
            {checkingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
            Apply
          </button>
        </div>
        {couponMsg && <p className={`text-sm mt-3 ${appliedCoupon ? 'text-olo' : 'text-danger'}`}>{couponMsg}</p>}
        {appliedCoupon && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-olo/10 text-olo text-sm font-medium">
            <Tag className="w-4 h-4" /> {appliedCoupon.code}
            <button onClick={() => { setAppliedCoupon(null); setCouponInput(''); setCouponMsg(''); }} className="ml-1 hover:text-foreground" aria-label="Remove coupon">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Non-sticky inside the AppShell — the app already has a fixed header */}
      <StickyCurrencySwitcher sticky={false} />

      {/* Scan packs */}
      <div className="mb-8">
        <h2 className="font-heading font-700 text-xl mb-1">Scan packs</h2>
        <p className="text-sm text-muted-foreground mb-5">One-time purchases. No commitment. Packs expire after 30 days. Daily scan expires after 24 hours.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {PACKS.map((p) => {
            const perScan = format(p.price / p.scans);
            const savings = +(p.scans * SCAN_PRICE - p.price).toFixed(2);
            return (
              <button
                key={p.id}
                onClick={() => goToCheckout(p.id)}
                className={`relative text-left p-5 rounded-2xl border transition-all flex flex-col ${
                  p.best ? 'border-olo bg-olo/5 olo-glow' : 'border-border hover:border-olo/40 bg-card'
                }`}
              >
                {p.best && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-olo px-3 py-1 rounded-full flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Best value
                  </span>
                )}
                <p className="font-heading font-600 text-base">{p.name}</p>
                <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading font-800 text-3xl">{format(p.price)}</span>
                  <span className="text-xs text-muted-foreground">one-time</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.scans} scans · {perScan}/scan</p>
                {savings > 0.01 && (
                  <span className="mt-2 inline-block text-[10px] font-semibold text-olo bg-olo/10 px-2 py-0.5 rounded-full w-fit">
                    Save {format(savings)} vs single scans
                  </span>
                )}
                {p.expiryDays && (
                  <span className="mt-1.5 inline-block text-[10px] font-semibold text-warning bg-warning-soft px-2 py-0.5 rounded-full w-fit">
                    Expires in {p.expiryDays === 1 ? '24 hours' : `${p.expiryDays} days`}
                  </span>
                )}
                {p.referralEligible && (
                  <span className="mt-1.5 inline-block text-[10px] font-semibold text-olo bg-olo/10 px-2 py-0.5 rounded-full w-fit">
                    Unlocks referrals
                  </span>
                )}
                <span className="mt-4 text-xs font-medium text-olo inline-flex items-center gap-1">
                  Get {p.name} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Family pack — shareable bundle */}
      <div className="mb-8 p-6 rounded-3xl border-2 border-olo/40 bg-olo/5 overflow-hidden relative">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-olo/15 rounded-full blur-[60px]" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-olo" />
              <h2 className="font-heading font-700 text-xl">Family pack</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {FAMILY.scans} scans to split across your household. Send scans to anyone by username — perfect for keeping the whole family's smiles on track.
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-olo">✓</span> {FAMILY.scans} shareable AI scans</li>
              <li className="flex items-start gap-2"><span className="text-olo">✓</span> Transfer scans to family members by username</li>
              <li className="flex items-start gap-2"><span className="text-olo">✓</span> Full analysis + braces check for everyone</li>
            </ul>
          </div>
          <div className="text-center sm:text-right">
            <div className="flex items-baseline gap-1 justify-center sm:justify-end">
              <span className="font-heading font-800 text-4xl">{format(FAMILY.price)}</span>
              <span className="text-xs text-muted-foreground">one-time</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{FAMILY.scans} scans · {format(+(FAMILY.price / FAMILY.scans).toFixed(2))}/scan</p>
            <button
              onClick={() => goToCheckout(FAMILY.id)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-2xl hover:scale-105 transition-transform olo-glow"
            >
              Get Family pack <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Custom scan builder */}
      <div className="mb-8 p-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-1">
          <ScanLine className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-700 text-xl">Build your own</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Buy exactly the scans you need at {format(SCAN_PRICE)}/scan.</p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setCount(customCount - 1)} className="w-10 h-10 rounded-xl border border-border hover:border-olo/40 flex items-center justify-center" aria-label="Fewer scans">
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[4rem]">
              <p className="font-heading font-800 text-3xl">{customCount}</p>
              <p className="text-xs text-muted-foreground">scans</p>
            </div>
            <button onClick={() => setCount(customCount + 1)} className="w-10 h-10 rounded-xl border border-border hover:border-olo/40 flex items-center justify-center" aria-label="More scans">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 25, 50].map((n) => (
              <button key={n} onClick={() => setCount(n)} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${customCount === n ? 'bg-olo text-white' : 'bg-muted text-muted-foreground hover:bg-olo/10'}`}>
                {n}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-heading font-800 text-2xl">{format(+(customCount * SCAN_PRICE).toFixed(2))}</p>
          </div>
        </div>
        <button
          onClick={() => goToCheckout('custom', customCount)}
          className="mt-5 w-full sm:w-auto sm:px-8 font-semibold px-6 py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 bg-olo text-white hover:scale-105 olo-glow"
        >
          Buy {customCount} scans <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Unlimited — monthly featured, yearly secondary, family unlimited */}
      <div className="mb-8">
        <h2 className="font-heading font-700 text-xl mb-5">Go unlimited</h2>
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Monthly — prominent */}
          <div className="relative p-6 rounded-3xl border-2 border-olo bg-olo-deep text-white olo-glow-strong overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-olo to-transparent" />
            <div className="absolute -top-6 -right-6 w-40 h-40 bg-olo/25 rounded-full blur-[80px]" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-olo" />
                  <h3 className="font-heading font-700 text-xl">Unlimited Monthly</h3>
                </div>
                <div className="bg-olo text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0">Most popular</div>
              </div>
              <p className="text-sm text-white/60 mb-5">Unlimited scanning. Cancel anytime.</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-heading font-800 text-4xl">{format(MONTHLY)}</span>
                <span className="text-white/50">/month</span>
              </div>
              <p className="text-sm font-semibold text-olo mb-5 whitespace-nowrap">Save {MONTHLY_SAVE_PCT}% vs paying per scan</p>

              <button
                onClick={() => goToCheckout('pro')}
                className="w-full font-semibold px-6 py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 bg-olo text-white hover:scale-105 olo-glow"
              >
                <Crown className="w-4 h-4" /> Go Unlimited
              </button>
            </div>
          </div>

          {/* Yearly — secondary, keeps savings */}
          <div className="p-6 rounded-3xl border border-border bg-card">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <InfinityIcon className="w-5 h-5 text-olo" />
                <h3 className="font-heading font-700 text-xl">Unlimited Yearly</h3>
              </div>
              <span className="text-xs font-bold text-white bg-olo px-3 py-1.5 rounded-full flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                <Tag className="w-3 h-3" /> 16% OFF
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Billed once a year — 2 months free.</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-muted-foreground line-through text-lg">{format(MONTHLY_YEARLY)}</span>
              <span className="font-heading font-800 text-3xl">{format(YEARLY)}</span>
              <span className="text-muted-foreground">/year</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">≈ {format(YEARLY_MONTHLY_EQ)}/mo billed annually</p>
            <p className="text-sm font-semibold text-olo mb-5">Save {format(SAVINGS)}</p>
            <button
              onClick={() => goToCheckout('pro_yearly')}
              className="w-full font-semibold px-6 py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 border-2 border-olo text-olo hover:bg-olo/5"
            >
              Go Yearly <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekly — low-commitment unlimited */}
        <div className="mt-5 p-6 rounded-3xl border border-border bg-card">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <InfinityIcon className="w-5 h-5 text-olo" />
              <h3 className="font-heading font-700 text-xl">Unlimited Weekly</h3>
            </div>
            <span className="text-xs font-bold text-white bg-olo px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0">New</span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">Unlimited scanning for 7 days. Perfect for a short tracking sprint.</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-heading font-800 text-3xl">{format(WEEKLY)}</span>
            <span className="text-muted-foreground">/week</span>
          </div>
          <p className="text-sm text-muted-foreground mb-1">≈ {format(+(WEEKLY / 7).toFixed(2))}/day · cancel anytime</p>
          <p className="text-sm font-semibold text-olo mb-5">Unlimited scans for 7 days</p>
          <button
            onClick={() => goToCheckout('pro_weekly')}
            className="w-full font-semibold px-6 py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 border-2 border-olo text-olo hover:bg-olo/5"
          >
            Go Weekly <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Family unlimited — full width (individual plans shown first) */}
        <div className="relative mt-5 p-6 rounded-3xl border-2 border-olo/50 bg-gradient-to-br from-olo-deep to-[#062a30] text-white olo-glow-strong overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-olo via-olo/60 to-transparent" />
          <div className="absolute -top-8 -right-8 w-44 h-44 bg-olo/20 rounded-full blur-[80px]" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-olo" />
                <h3 className="font-heading font-700 text-xl">Family Unlimited</h3>
                <span className="text-[10px] font-bold text-white bg-olo px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">5 members</span>
              </div>
              <p className="text-sm text-white/60 mb-3">Unlimited scanning for a family of 5. Each member gets their own unlimited scans — perfect for keeping everyone's smile on track.</p>

            </div>
            <div className="text-center sm:text-right flex-shrink-0">
              <div className="flex items-baseline gap-2 justify-center sm:justify-end">
                <span className="font-heading font-800 text-4xl">{format(FAMILY_PRO)}</span>
                <span className="text-white/50">/month</span>
              </div>
              <p className="text-xs text-white/40 mb-3">billed monthly · cancel anytime</p>
              <button
                onClick={() => goToCheckout('family_pro')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-2xl hover:scale-105 transition-transform olo-glow"
              >
                <Users className="w-4 h-4" /> Get Family Unlimited
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Savings comparison bar */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <h3 className="font-heading font-600 text-sm mb-3 text-center">Cost over a year</h3>
        <div className="space-y-2.5">
          {[
            { label: `Monthly (${format(MONTHLY)} × 12)`, value: MONTHLY_YEARLY, color: 'bg-muted-foreground', note: '' },
            { label: 'Yearly', value: YEARLY, color: 'bg-olo', note: `save ${format(SAVINGS)}` },
          ].map((row) => {
            const max = MONTHLY_YEARLY;
            const pct = (row.value / max) * 100;
            return (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{row.note ? <span className="text-olo">{format(row.value)} · {row.note}</span> : format(row.value)}</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchase history */}
      <div className="mt-8 p-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-700 text-lg">Purchase history</h2>
        </div>
        {purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchases yet. Your plans and scan packs will show up here.</p>
        ) : (
          <ul className="divide-y divide-border">
            {purchases.slice().reverse().map((p, i) => (
              <li key={(p.reference || i) + i} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{PLAN_LABELS[p.plan] || p.plan}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.scans_added > 0 ? `+${p.scans_added} scans${p.bonus_scans ? ` (incl. ${p.bonus_scans} bonus)` : ''} · ` : ''}{format(p.amount_usd)} · {new Date(p.date).toLocaleDateString()}
                  </p>
                </div>
                {p.reference && <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">{p.reference.slice(-8)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <PaystackTrustNote />
      </div>
      <p className="text-center text-xs text-muted-foreground mt-2">
        Scan packs expire after 30 days. Daily scans expire after 24 hours. Unused scans roll over when you renew on time.
      </p>
      <p className="text-center text-[11px] text-warning mt-2 flex items-start justify-center gap-1.5">
        <ArrowLeftRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <span>All transactions are finalized in Naira (₦). Prices in other currencies are for display only and converted at live rates.</span>
      </p>
    </div>
  );
}