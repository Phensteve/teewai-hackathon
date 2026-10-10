import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getClientIp } from '../../shared/ipUtils.ts';
import { INSFORGE_BASE_URL, authHeaders, buildQuery } from '../../shared/insforge.ts';
import { DeviceFingerprint } from '../../shared/securityInsforge.ts';

// Called once per session for signed-in users. Records the device for
// accounts created before device tracking existed, and keeps the paid flag
// current so paid accounts don't count toward the 3-free-per-device limit.
export default async function(req: Request) {
  const unrufld = createClientFromRequest(req);
  const user = await unrufld.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const deviceHash = String(body.device_hash || '').slice(0, 128);
  if (!deviceHash) return Response.json({ error: 'device_hash required' }, { status: 400 });

  const subRes = await fetch(`${INSFORGE_BASE_URL}/api/database/records/subscriptions?${buildQuery({ userId: user.id }, { limit: 1 })}`, { headers: authHeaders() });
  const subs = await subRes.json().catch(() => []);
  const sub = Array.isArray(subs) ? subs[0] : null;
  const isPaid = !!sub && sub.plan && sub.plan !== 'free' && sub.status !== 'canceled';

  const fp = DeviceFingerprint;
  const rows = await fp.filter({ user_id: user.id }, '-created_date', 50);
  const ip = getClientIp(req);

  if (!rows.some((r: any) => r.device_hash === deviceHash)) {
    await fp.create({ device_hash: deviceHash, user_id: user.id, user_email: user.email, ip_address: ip, is_paid: isPaid });
  }
  const stale = rows.filter((r: any) => !!r.is_paid !== isPaid).map((r: any) => ({ id: r.id, is_paid: isPaid }));
  if (stale.length) await fp.bulkUpdate(stale);

  return Response.json({ ok: true, is_paid: isPaid });
}