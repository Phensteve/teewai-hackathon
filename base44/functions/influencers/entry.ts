import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { influencerStats, findCoupon } from '../../shared/influencerStats.ts';

export default async function(req) {
  try {
    const client = createClientFromRequest(req);
    const p = await req.json();
    const e = client.asServiceRole.entities;
    const code = String(p.code || '').trim().toUpperCase();
    if (p.op === 'validate' || p.op === 'claim') {
      if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return Response.json({ error: 'Enter a valid invitation code' }, { status: 400 });
      const page = await e.InfluencerCampaign.filter({ invitation_code: code, active: true }, { limit: 1 });
      const campaign = page.items[0];
      if (!campaign) return Response.json({ error: 'Invitation code is not active' }, { status: 400 });
      if (p.op === 'validate') return Response.json({ valid: true, name: campaign.name });
      const user = await client.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const previous = await e.InfluencerSignup.filter({ user_id: user.id }, { limit: 1 });
      if (previous.items.length) return Response.json({ recorded: true });
      const age = Date.now() - new Date(user.created_date).getTime();
      if (!Number.isFinite(age) || age < 0 || age > 24 * 3600000) return Response.json({ recorded: false, reason: 'Only new account signups count' });
      await e.InfluencerSignup.upsert([{ campaign_id: campaign.id, user_id: user.id, invitation_code: code }], { key: 'user_id' });
      return Response.json({ recorded: true });
    }
    if (p.op === 'progress' || p.op === 'requestPayout') {
      const token = String(p.tracking_token || '');
      if (!/^[0-9a-f-]{36}$/.test(token)) return Response.json({ error: 'Invalid tracking link' }, { status: 404 });
      const page = await e.InfluencerCampaign.filter({ tracking_token: token }, { limit: 1 });
      if (!page.items[0]) return Response.json({ error: 'Tracking link not found' }, { status: 404 });
      if (p.op === 'requestPayout') return Response.json({ error: 'Payout requests are disabled until the payment structure is configured' }, { status: 409 });
      const c = (await influencerStats(e, page.items))[0];
      const payouts = await e.InfluencerPayout.filter({ campaign_id: c.id }, { limit: 50, sort: '-created_date', fields: ['amount', 'currency', 'status', 'settled_at', 'created_date'] });
      return Response.json({ name: c.name, invitation_code: c.invitation_code || null, signup_count: c.signup_count, discount_code: c.discount_code, discount_uses: c.discount_uses, active: c.active, discount_active: c.discount_active, payouts_configured: false, pending_payment: null, payouts: payouts.items });
    }
    // Reuse the existing standalone admin session verifier; no second auth implementation.
    let admin;
    if (p.admin_token) {
      const result = await client.functions.invoke('adminAuth', { op: 'me', token: p.admin_token });
      admin = result.data;
    } else {
      const user = await client.auth.me();
      if (user?.role === 'admin') admin = { username: user.id, role: 'super_admin' };
    }
    if (!admin?.username || !admin?.role) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (p.op === 'payoutCount') return Response.json({ pending: await e.InfluencerPayout.count({ status: 'pending' }) });
    if (p.op === 'couponCampaigns') {
      const ids = Array.isArray(p.coupon_ids) ? p.coupon_ids.slice(0, 100) : [];
      const page = ids.length ? await e.InfluencerCampaign.filter({ coupon_id: { $in: ids } }, { limit: 100 }) : { items: [] };
      return Response.json({ items: page.items });
    }
    if (p.op === 'list') {
      const page = await e.InfluencerCampaign.filter({}, { limit: 50, sort: '-created_date', ...(p.cursor ? { cursor: p.cursor } : {}) });
      return Response.json({ ...page, items: await influencerStats(e, page.items) });
    }
    if (p.op === 'payouts') {
      const [page, pending] = await Promise.all([
        e.InfluencerPayout.filter({}, { limit: 50, sort: '-created_date', ...(p.cursor ? { cursor: p.cursor } : {}) }),
        e.InfluencerPayout.count({ status: 'pending' }),
      ]);
      return Response.json({ ...page, pending });
    }
    if (!['super_admin', 'admin'].includes(admin.role)) return Response.json({ error: 'Only admins can manage influencer codes and payouts' }, { status: 403 });
    if (p.op === 'settle') {
      const payout = await e.InfluencerPayout.get(String(p.id || ''));
      if (!payout) return Response.json({ error: 'Payout not found' }, { status: 404 });
      if (payout.status === 'pending') await e.InfluencerPayout.update(payout.id, { status: 'settled', settled_at: new Date().toISOString(), settled_by: admin.username });
      return Response.json({ ok: true });
    }
    if (admin.role !== 'super_admin') return Response.json({ error: 'Only super admins can create or link codes' }, { status: 403 });
    if (p.op === 'couponCampaign') {
      if (!p.coupon_id) return Response.json({ error: 'Discount code required' }, { status: 400 });
      const found = await e.InfluencerCampaign.filter({ coupon_id: p.coupon_id }, { limit: 1 });
      if (found.items[0]) return Response.json({ campaign: found.items[0] });
      const coupon = await findCoupon(p.coupon_id);
      const campaign = await e.InfluencerCampaign.create({ name: coupon.code, coupon_id: coupon.id, tracking_token: crypto.randomUUID(), active: true });
      return Response.json({ campaign });
    }
    if (p.op === 'create') {
      const name = String(p.name || '').trim();
      if (!name || name.length > 100 || !/^[A-Z0-9_-]{3,32}$/.test(code)) return Response.json({ error: 'Enter an influencer name and a 3–32 character code (letters, numbers, _ or -)' }, { status: 400 });
      const duplicate = await e.InfluencerCampaign.filter({ invitation_code: code }, { limit: 1 });
      if (duplicate.items[0] && duplicate.items[0].id !== p.campaign_id) return Response.json({ error: 'Invitation code already exists' }, { status: 409 });
      let campaign;
      if (p.campaign_id) {
        campaign = await e.InfluencerCampaign.get(p.campaign_id);
        if (!campaign || campaign.invitation_code) return Response.json({ error: 'This influencer already has an invitation code' }, { status: 409 });
        campaign = await e.InfluencerCampaign.update(campaign.id, { name, invitation_code: code });
      } else campaign = await e.InfluencerCampaign.create({ name, invitation_code: code, tracking_token: crypto.randomUUID(), active: true });
      return Response.json({ campaign });
    }
    if (p.op === 'linkCoupon') {
      const campaign = await e.InfluencerCampaign.get(String(p.campaign_id || ''));
      if (!campaign || !p.coupon_id) return Response.json({ error: 'Influencer and discount code required' }, { status: 400 });
      await findCoupon(p.coupon_id);
      const duplicate = await e.InfluencerCampaign.filter({ coupon_id: p.coupon_id }, { limit: 1 });
      if (duplicate.items[0] && duplicate.items[0].id !== campaign.id) return Response.json({ error: 'Discount code belongs to another influencer' }, { status: 409 });
      await e.InfluencerCampaign.update(campaign.id, { coupon_id: p.coupon_id });
      return Response.json({ ok: true });
    }
    if (p.op === 'toggle') {
      const campaign = await e.InfluencerCampaign.get(String(p.id || ''));
      if (!campaign) return Response.json({ error: 'Influencer not found' }, { status: 404 });
      await e.InfluencerCampaign.update(campaign.id, { active: !campaign.active });
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not complete influencer request' }, { status: 500 });
  }
}