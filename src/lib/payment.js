import { unrufld } from '@/api/unrufldClient';

export const FREE_SCANS = 5;
export const SCAN_PRICE = 0.25;
// Paystack (NG merchant) settles in NGN at this fixed USD→NGN rate. The
// checkout shows the charge in NGN using this same rate so the displayed
// total always matches the actual Paystack charge — live display rates can
// differ and make the real charge look "excessive" vs what was shown.
export const USD_TO_NGN = 1500;

export const MONTHLY = 24.99;
export const YEARLY = 251.95;
export const WEEKLY = 8.0; // ₦12,000/week
export const FAMILY_PRO = 99.95;
export const YEARLY_MONTHLY_EQ = +(YEARLY / 12).toFixed(2);
export const MONTHLY_YEARLY = MONTHLY * 12;
export const SAVINGS = +(MONTHLY_YEARLY - YEARLY).toFixed(2);
// Headline saving shown on the Unlimited Monthly plan vs paying per scan.
export const MONTHLY_SAVE_PCT = 14;

export const PACKS = [
  { id: 'pack_daily', name: 'Daily', price: 0.067, scans: 1, desc: '1 scan · expires in 24h', expiryDays: 1, referralEligible: true },
  { id: 'pack_2', name: 'Starter', price: 0.99, scans: 5, desc: 'Try teewai', expiryDays: 30 },
  { id: 'pack_15', name: 'Plus', price: 4.58, scans: 25, desc: 'Track a cycle', expiryDays: 30 },
  { id: 'pack_30', name: 'Boost', price: 9.99, scans: 60, desc: 'Best value', best: true, expiryDays: 30 },
];

// Pack expiry: how long purchased scans remain usable (in days).
export const PACK_EXPIRY_DAYS = { pack_2: 30, pack_15: 30, pack_30: 30, pack_daily: 1, family_15: 30, custom: 30, family_extra_member: 30 };

// Rollover grace period for unused pack scans when a subscription renews.
export const ROLLOVER_DAYS = { pro: 10.5, pro_yearly: 45, pro_weekly: 1 };

// Family pack — a shareable bundle of scans meant to be split among household
// members via the scan-transfer feature. Priced as a premium family bundle.
export const FAMILY = { id: 'family_15', name: 'Family', price: 10.49, scans: 75, desc: '15 scans × 5 members' };
export const EXTRA_MEMBER = { id: 'family_extra_member', name: 'Extra Family Member', price: 1.74, scans: 15 };

export const PLAN_LABELS = {
  free: 'Free',
  pack_2: 'Starter pack',
  pack_15: 'Plus pack',
  pack_30: 'Boost pack',
  pack_daily: 'Daily scan',
  family_15: 'Family pack',
  family_extra_member: 'Extra family member',
  custom: 'Custom scans',
  pro: 'Unlimited Monthly',
  pro_yearly: 'Unlimited Yearly',
  pro_weekly: 'Unlimited Weekly',
  family_pro: 'Family Unlimited',
};

export const SCANS_FOR = (planId) =>
  planId === 'pack_2' ? 5 : planId === 'pack_15' ? 25 : planId === 'pack_30' ? 60 : planId === 'pack_daily' ? 1 : planId === 'family_15' ? 75 : planId === 'family_extra_member' ? 15 : 0;

export const USD_FOR = (planId, scans) => {
  if (planId === 'pack_2') return 0.99;
  if (planId === 'pack_15') return 4.58;
  if (planId === 'pack_30') return 9.99;
  if (planId === 'pack_daily') return 0.067;
  if (planId === 'family_15') return 10.49;
  if (planId === 'family_extra_member') return 1.74;
  if (planId === 'custom') return +(scans * SCAN_PRICE).toFixed(2);
  if (planId === 'pro') return MONTHLY;
  if (planId === 'pro_yearly') return YEARLY;
  if (planId === 'pro_weekly') return WEEKLY;
  if (planId === 'family_pro') return FAMILY_PRO;
  return 0;
};

const FIRST50_BONUS = { pack_2: 1, pack_15: 2, pack_30: 3, family_15: 3 };
export function computeFirst50Bonus(planId, early, purchasesBefore) {
  if (!early?.isEarly) return 0;
  if (!Array.isArray(purchasesBefore) || purchasesBefore.length >= 2) return 0;
  return FIRST50_BONUS[planId] || 0;
}

export function buildPurchasePayload(current, planId, scansBought, reference, dateStr, bonusScans = 0) {
  const now = new Date();
  const dateISO = dateStr || now.toISOString();
  const baseScans = planId === 'custom' ? scansBought : SCANS_FOR(planId);
  const scansToAdd = baseScans + bonusScans;
  const amountUsd = USD_FOR(planId, scansBought);
  const purchase = { plan: planId, scans_added: scansToAdd, bonus_scans: bonusScans, amount_usd: amountUsd, reference, date: dateISO };
  const purchases = [...(current.purchases || []), purchase];

  if (planId === 'pro' || planId === 'pro_yearly' || planId === 'family_pro' || planId === 'pro_weekly') {
    const renewal = new Date(dateISO);
    if (planId === 'pro_yearly') renewal.setFullYear(renewal.getFullYear() + 1);
    else if (planId === 'pro_weekly') renewal.setDate(renewal.getDate() + 7);
    else renewal.setMonth(renewal.getMonth() + 1);
    return {
      plan: planId, status: 'active',
      started_date: current.started_date || dateISO,
      renewal_date: renewal.toISOString(),
      scans_limit: 9999, scans_used: current.scans_used || 0, purchases,
    };
  }
  const isUnlimitedActive = (current.plan === 'pro' || current.plan === 'pro_yearly' || current.plan === 'pro_weekly' || current.plan === 'family_pro') &&
    current.renewal_date && new Date(current.renewal_date) > now;
  const baseLimit = isUnlimitedActive ? current.scans_limit : Math.max(current.scans_limit || 0, current.scans_used || 0);
  return {
    plan: isUnlimitedActive ? current.plan : planId,
    status: 'active',
    scans_limit: baseLimit + scansToAdd,
    scans_used: current.scans_used || 0,
    purchases,
    ...(isUnlimitedActive ? {} : { renewal_date: null }),
  };
}

// Compute the rollover deadline for a subscription (when unused pack scans
// expire after a renewal). Returns a Date or null.
export function rolloverDeadline(subscription) {
  if (!subscription?.plan || !subscription?.renewal_date) return null;
  const days = ROLLOVER_DAYS[subscription.plan];
  if (!days) return null;
  const rd = new Date(subscription.renewal_date);
  rd.setDate(rd.getDate() + days);
  return rd;
}

// Check if the most recent pack purchase has expired.
export function isPackExpired(subscription) {
  if (!subscription?.purchases?.length) return false;
  const now = new Date();
  const packPurchases = subscription.purchases.filter((p) =>
    p && p.plan && !['pro', 'pro_yearly', 'pro_weekly', 'family_pro', 'free'].includes(p.plan)
  );
  if (!packPurchases.length) return false;
  const latest = packPurchases[packPurchases.length - 1];
  if (latest.expires_at) return new Date(latest.expires_at) <= now;
  const expiryDays = PACK_EXPIRY_DAYS[latest.plan] || 30;
  return new Date(latest.date).getTime() + expiryDays * 86400000 <= now.getTime();
}

export function canApplePay() {
  return typeof window !== 'undefined' &&
    typeof window.ApplePaySession !== 'undefined' &&
    window.ApplePaySession.canMakePayments();
}

export async function getEarlyAdopter() {
  // Server-side check against ALL users — the old client-side read was scoped
  // to the caller's own row, which made everyone "user #1".
  try {
    const res = await unrufld.functions.invoke('userProfile', { op: 'earlyAdopter' });
    return res.data?.isEarly ? { isEarly: true, userNumber: res.data.userNumber } : null;
  } catch {
    return null;
  }
}

// Coupon discount (matches base44/functions/paystack/entry.ts).
export function computeDiscountedUsd(usd, coupon) {
  if (!coupon) return usd;
  const val = Number(coupon.discount_value) || 0;
  const discount = coupon.discount_type === 'percent' ? usd * (val / 100) : Math.min(usd, val);
  // A 100% (or over-value fixed) coupon makes the order free — never floor to
  // $0.01 (that surfaces as a ~₦15 Paystack charge). Exact to the cent.
  return Math.max(0, +(usd - discount).toFixed(2));
}

// A fixed-amount coupon worth more than the pack forfeits the excess.
export function couponExceedsPrice(usd, coupon) {
  if (!coupon || coupon.discount_type !== 'fixed_amount') return false;
  return (Number(coupon.discount_value) || 0) > usd;
}

// Redeem a fully-discounted order (100% / excess coupon) without going through
// Paystack — a ₦0 transaction can't be initialized, so the backend activates
// the plan directly and records the coupon usage.
export async function freeActivate(plan, scans, coupon) {
  try {
    const res = await unrufld.functions.invoke('paystack', { action: 'freeActivate', plan, scans, coupon: coupon?.code });
    if (res.data?.ok) return { ok: true, plan: res.data.plan, scans: res.data.scans, reference: res.data.reference, subscription: res.data.subscription };
    return { ok: false, error: res.data?.error || 'Could not redeem this coupon.' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not redeem this coupon.' };
  }
}

// Verify a Paystack payment and activate the plan. Returns { ok, plan, scans, reference, subscription, error }.
export async function verifyAndActivate(reference, planHint, earlyAdopter) {
  if (!reference) return { ok: false, error: 'No payment reference.' };
  try {
    const verifyRes = await unrufld.functions.invoke('paystack', { action: 'verify', reference });
    if (!verifyRes.data.paid) {
      return { ok: false, error: 'Payment could not be verified. If you were charged, contact support.' };
    }
    const stored = JSON.parse(sessionStorage.getItem('teewai_pay') || '{}');
    const planId = verifyRes.data.plan || planHint || stored.plan;
    const scansBought = verifyRes.data.scans || stored.scans || 0;
    if (!planId) return { ok: false, error: 'Could not determine the plan you paid for. Contact support.' };
    if (!verifyRes.data.subscription) {
      return { ok: false, error: 'Could not find your account. Contact support.' };
    }
    // Activation now happens server-side (Paystack verify writes plan +
    // scans_limit with the service token, bypassing the user proxy strip).
    return { ok: true, plan: planId, scans: scansBought, bonus: verifyRes.data.bonus || 0, reference, subscription: verifyRes.data.subscription };
  } catch (e) {
    return { ok: false, error: e?.message || 'Payment verification failed.' };
  }
}