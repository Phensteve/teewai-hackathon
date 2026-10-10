// Shared subscription activation + coupon logic used by every payment
// provider (Paystack, Bachs, …) so a purchase syncs to InsForge identically
// regardless of how the customer paid. Extracted here so no provider keeps
// a private copy of the credit/coupon logic.
import { INSFORGE_BASE_URL, authHeaders, buildQuery } from './insforge.ts';

// Authoritative plan prices in USD. The frontend display prices must match these.
export const PLAN_PRICES = {
  pack_2: 0.99,
  pack_15: 4.99,
  pack_30: 9.99,
  pack_daily: 0.067, // ₦100 — 1 scan, expires in 1 day
  family_15: 10.49,
  family_extra_member: 1.74,
  pro: 24.99,
  pro_yearly: 251.95,
  pro_weekly: 8.0, // ₦12,000/week
  family_pro: 99.95,
};
export const SCAN_PRICE = 0.25;

// Human-readable plan names for receipts and confirmations.
export const PLAN_LABELS = {
  pack_2: 'Starter Pack',
  pack_15: 'Smile Pack',
  pack_30: 'Pro Pack',
  pack_daily: 'Daily Scan',
  family_15: 'Family Plan',
  family_extra_member: 'Extra Family Member',
  pro: 'Pro (monthly)',
  pro_yearly: 'Pro (yearly)',
  pro_weekly: 'Pro (weekly)',
  family_pro: 'Family Unlimited',
  custom: 'Custom Scan Pack',
};

export const SCANS_FOR_PLAN = (p) => (p === 'pack_2' ? 4 : p === 'pack_15' ? 30 : p === 'pack_30' ? 60 : p === 'pack_daily' ? 1 : p === 'family_15' ? 150 : p === 'family_extra_member' ? 30 : 0);
export const UNLIMITED_PLANS = new Set(['pro', 'pro_yearly', 'family_pro', 'pro_weekly']);
export const FIRST50_BONUS = { pack_2: 1, pack_15: 2, pack_30: 3, family_15: 3 };

// Pack expiry: how long purchased scans remain usable (in days).
export const PACK_EXPIRY_DAYS = { pack_2: 30, pack_15: 30, pack_30: 30, pack_daily: 1, family_15: 30, custom: 30, family_extra_member: 30 };

// Rollover grace period: how long unused pack scans carry into the next
// subscription cycle (in days). Monthly: 1.5 weeks, Yearly: 1.5 months,
// Weekly: 1 day.
export const ROLLOVER_DAYS = { pro: 10.5, pro_yearly: 45, pro_weekly: 1 };

export function subEntity(row) {
  if (!row) return null;
  const d = row.data || {};
  return {
    id: row.id,
    plan: row.plan,
    status: row.status,
    scans_used: Number(row.scansUsed ?? 0),
    scans_limit: Number(row.scansLimit ?? 0),
    ...d,
    created_date: row.created_at,
    updated_date: row.updated_at,
  };
}

export async function isEarlyAdopter(userId) {
  try {
    const r = await fetch(`${INSFORGE_BASE_URL}/api/database/records/users_mirror?order=created_at.asc&limit=50`, { headers: authHeaders() });
    const arr = await r.json().catch(() => []);
    return Array.isArray(arr) && arr.some((u) => u && u.userId === userId);
  } catch { return false; }
}

// Validate a coupon code against a list price. Returns the discounted USD
// amount and the normalized code (null if the coupon is absent/invalid).
export async function validateCoupon(couponInput, listUsd) {
  if (!couponInput) return { finalUsd: listUsd, couponCode: null };
  const code = String(couponInput).toUpperCase().trim();
  try {
    const cr = await fetch(`${INSFORGE_BASE_URL}/api/database/records/coupons?${buildQuery({ code })}`, { headers: authHeaders() });
    const carr = await cr.json().catch(() => []);
    const c = Array.isArray(carr) && carr[0];
    if (c && c.active !== false) {
      const d = c.data || {};
      const expired = d.expires_date && new Date(d.expires_date) < new Date();
      const exhausted = Number(d.max_uses) > 0 && Number(d.used_count || 0) >= Number(d.max_uses);
      if (!expired && !exhausted) {
        const val = Number(d.discount_value) || 0;
        const discountUsd = d.discount_type === 'percent' ? listUsd * (val / 100) : Math.min(listUsd, val);
        return { finalUsd: Math.max(0, +(listUsd - discountUsd).toFixed(2)), couponCode: code };
      }
    }
  } catch {}
  return { finalUsd: listUsd, couponCode: null };
}

// Increment a coupon's used_count (idempotent-ish: best-effort).
export async function recordCouponUse(code) {
  if (!code) return;
  try {
    const cr = await fetch(`${INSFORGE_BASE_URL}/api/database/records/coupons?${buildQuery({ code })}`, { headers: authHeaders() });
    const carr = await cr.json().catch(() => []);
    const c = Array.isArray(carr) && carr[0];
    if (c) {
      const d = c.data || {};
      const next = (Number(d.used_count) || 0) + 1;
      await fetch(`${INSFORGE_BASE_URL}/api/database/records/coupons?${buildQuery({ code })}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), Prefer: 'return=representation' },
        body: JSON.stringify({ data: { ...d, used_count: next } }),
      });
    }
  } catch {}
}

// Credits a purchased plan/scans to the user's InsForge subscription. Uses the
// service token (bypasses the user proxy that strips plan + scans_limit) so
// the purchase actually persists. Idempotent on the payment reference.
export async function activateSubscription(user, planId, scansBought, reference, paidUsd) {
  if (!planId) return { bonus: 0, subscription: null };
  const subRes = await fetch(`${INSFORGE_BASE_URL}/api/database/records/subscriptions?${buildQuery({ userId: user.id })}`, { headers: authHeaders() });
  const subs = await subRes.json().catch(() => []);
  const current = Array.isArray(subs) && subs[0] ? subs[0] : null;
  if (!current) return { bonus: 0, subscription: null };

  const curData = current.data || {};
  const purchasesBefore = Array.isArray(curData.purchases) ? curData.purchases : [];

  // Idempotent: don't re-credit a payment already recorded (e.g. page reload).
  const existing = purchasesBefore.find((p) => p && p.reference === reference);
  if (existing) return { bonus: existing.bonus_scans || 0, subscription: subEntity(current) };

  const isEarly = await isEarlyAdopter(user.id);
  const bonus = isEarly && purchasesBefore.length < 2 ? (FIRST50_BONUS[planId] || 0) : 0;

  const now = new Date();
  const dateISO = now.toISOString();
  const baseScans = planId === 'custom' ? scansBought : SCANS_FOR_PLAN(planId);
  const scansToAdd = baseScans + bonus;
  const listUsd = planId === 'custom' ? +(scansBought * SCAN_PRICE).toFixed(2) : (PLAN_PRICES[planId] || 0);
  const amountUsd = paidUsd != null ? paidUsd : listUsd;
  // Attach an expiry date to pack purchases so scans auto-expire.
  const expiryDays = PACK_EXPIRY_DAYS[planId] || (planId === 'custom' ? 30 : 0);
  const expiresAt = expiryDays > 0 ? new Date(Date.now() + expiryDays * 86400000).toISOString() : null;
  const purchases = [...purchasesBefore, { plan: planId, scans_added: scansToAdd, bonus_scans: bonus, amount_usd: amountUsd, reference, date: dateISO, expires_at: expiresAt }];

  const curPlan = current.plan;
  const curLimit = Number(current.scansLimit ?? 0);
  const curUsed = Number(current.scansUsed ?? 0);
  const curRenewal = curData.renewal_date;
  const curStarted = curData.started_date;

  let newPlan, newStatus, newLimit, newData;
  if (planId === 'pro' || planId === 'pro_yearly' || planId === 'family_pro' || planId === 'pro_weekly') {
    const renewal = new Date(dateISO);
    if (planId === 'pro_yearly') renewal.setFullYear(renewal.getFullYear() + 1);
    else if (planId === 'pro_weekly') renewal.setDate(renewal.getDate() + 7);
    else renewal.setMonth(renewal.getMonth() + 1);
    // Rollover: when renewing an expired unlimited plan, set a deadline for
    // carrying over remaining pack scans into the new cycle.
    let rolloverDeadline = curData.rollover_deadline;
    const rolloverDays = ROLLOVER_DAYS[planId];
    if (rolloverDays && curPlan && UNLIMITED_PLANS.has(curPlan) && curRenewal && new Date(curRenewal) <= now) {
      const rd = new Date(renewal.getTime());
      rd.setDate(rd.getDate() + rolloverDays);
      rolloverDeadline = rd.toISOString();
    }
    newPlan = planId; newStatus = 'active'; newLimit = 9999;
    newData = { ...curData, purchases, started_date: curStarted || dateISO, renewal_date: renewal.toISOString(), rollover_deadline: rolloverDeadline || undefined };
  } else {
    const isUnlimitedActive = (curPlan === 'pro' || curPlan === 'pro_yearly' || curPlan === 'pro_weekly' || curPlan === 'family_pro') && curRenewal && new Date(curRenewal) > now;
    const baseLimit = isUnlimitedActive ? curLimit : Math.max(curLimit, curUsed);
    newPlan = isUnlimitedActive ? curPlan : planId;
    newStatus = 'active';
    newLimit = baseLimit + scansToAdd;
    newData = { ...curData, purchases, started_date: curStarted, renewal_date: isUnlimitedActive ? curRenewal : null };
  }

  if (planId === 'family_15' || planId === 'family_pro') {
    const members = Array.isArray(newData.members) ? [...newData.members] : [];
    while (members.length < 5) members.push({ name: '', email: '', link: '', role: 'other', scans_used: 0, scans_limit: 30 });
    if (!members[0].name && !members[0].link) {
      const ownerName = user.display_name || user.username || user.full_name || (user.email ? user.email.split('@')[0] : 'You');
      members[0] = { ...members[0], name: ownerName, email: user.email || '', role: 'other', scans_limit: 30 };
    }
    const existingPackTotal = Number(curData.pack_scans_total || 0);
    if (existingPackTotal === 0) {
      const packLeftover = Math.max(0, curLimit - curUsed);
      const packTotal = packLeftover + bonus;
      newData = { ...newData, members, pack_scans_total: packTotal, pack_scans_remaining: packTotal };
    } else {
      newData = { ...newData, members };
    }
  }

  await fetch(`${INSFORGE_BASE_URL}/api/database/records/subscriptions?${buildQuery({ id: current.id })}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify({ plan: newPlan, status: newStatus, scansLimit: newLimit, scansUsed: curUsed, data: newData }),
  });

  return { bonus, subscription: subEntity({ ...current, plan: newPlan, status: newStatus, scansLimit: newLimit, scansUsed: curUsed, data: newData }) };
}