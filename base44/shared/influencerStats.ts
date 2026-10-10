import { INSFORGE_BASE_URL, authHeaders, buildQuery } from './insforge.ts';

export async function influencerStats(entities, campaigns) {
  if (!campaigns.length) return [];
  const ids = campaigns.map(c => c.id);
  const couponIds = campaigns.map(c => c.coupon_id).filter(Boolean);
  const [signups, coupons] = await Promise.all([
    entities.InfluencerSignup.aggregate({ query: { campaign_id: { $in: ids } }, groupBy: 'campaign_id' }),
    couponIds.length ? fetch(`${INSFORGE_BASE_URL}/api/database/records/coupons?${buildQuery({ id: { in: couponIds } }, { select: 'id,code,active,data', limit: 50 })}`, { headers: authHeaders(), signal: AbortSignal.timeout(10000) }).then(async r => { if (!r.ok) throw new Error('Could not load discount usage'); return await r.json(); }) : Promise.resolve([]),
  ]);
  const totals = new Map(signups.rows.map(r => [r.campaign_id, r.count]));
  const discounts = new Map(coupons.map(c => [c.id, c]));
  return campaigns.map(c => {
    const coupon = discounts.get(c.coupon_id);
    return { ...c, signup_count: totals.get(c.id) || 0, discount_code: coupon?.code || null, discount_uses: Number(coupon?.data?.used_count) || 0, discount_active: coupon?.active ?? false, coupon_missing: !!c.coupon_id && !coupon, payouts_configured: false, pending_payment: null };
  });
}

export async function findCoupon(id) {
  const r = await fetch(`${INSFORGE_BASE_URL}/api/database/records/coupons?${buildQuery({ id }, { limit: 1 })}`, { headers: authHeaders(), signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('Could not load discount code');
  const rows = await r.json();
  if (!rows[0]) throw new Error('Discount code not found');
  return rows[0];
}