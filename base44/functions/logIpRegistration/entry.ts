import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getClientIp } from '../../shared/ipUtils.ts';
import { INSFORGE_BASE_URL, authHeaders, buildQuery } from '../../shared/insforge.ts';
import { DeviceFingerprint } from '../../shared/securityInsforge.ts';

// Authenticated endpoint: called after successful registration to log
// the user's IP for abuse-prevention tracking. Deduplicates by userId.

async function callInsforge(path: string, init: any = {}) {
  const headers = { ...authHeaders(), ...(init.headers || {}) };
  const res = await fetch(`${INSFORGE_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return { ok: res.ok, status: res.status, data };
}

export default async function(req: Request) {
  try {
    const unrufld = createClientFromRequest(req);
    const user = await unrufld.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || '').trim();
    const deviceHash = String(body.device_hash || '').slice(0, 128);

    // Record the device fingerprint so the 3-accounts-per-device limit works.
    if (deviceHash) {
      try {
        const fp = DeviceFingerprint;
        const mine = await fp.filter({ device_hash: deviceHash, user_id: user.id }, '-created_date', 1);
        if (mine.length === 0) {
          await fp.create({ device_hash: deviceHash, user_id: user.id, user_email: user.email, ip_address: ip, is_paid: false });
        }
      } catch { /* non-fatal */ }
    }

    // Deduplicate — if this user is already logged, just update the IP
    const existingRes = await callInsforge(
      `/api/database/records/ip_registrations?${buildQuery({ userId: user.id }, { limit: 1 })}`
    );
    const existing = existingRes.ok && Array.isArray(existingRes.data) ? existingRes.data[0] : null;

    if (existing) {
      if (existing.ipAddress !== ip) {
        await callInsforge(
          `/api/database/records/ip_registrations?${buildQuery({ id: existing.id })}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify({ ipAddress: ip }),
          }
        );
      }
      return Response.json({ ok: true, already_logged: true });
    }

    await callInsforge(`/api/database/records/ip_registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        ipAddress: ip,
        userEmail: user.email,
        userId: user.id,
        username: username || null,
      }),
    });

    // Server-side enforcement: if the client-side check was bypassed and this
    // IP now has 4+ free accounts with fewer than 2 paid, auto-suspend.
    try {
      const regRes = await callInsforge(
        `/api/database/records/ip_registrations?${buildQuery({ ipAddress: ip }, { order: { column: 'created_at', ascending: false }, limit: 50 })}`
      );
      const registrations = regRes.ok && Array.isArray(regRes.data) ? regRes.data : [];
      const userIds = registrations.map((r: any) => r.userId).filter(Boolean);
      const paidUserIds = new Set<string>();
      if (userIds.length > 0) {
        const subRes = await callInsforge(
          `/api/database/records/subscriptions?${buildQuery({ userId: { in: userIds } }, { limit: 10000 })}`
        );
        const subs = subRes.ok && Array.isArray(subRes.data) ? subRes.data : [];
        for (const s of subs) {
          if (s.plan && s.plan !== 'free') {
            paidUserIds.add(s.userId);
          }
        }
      }
      let freeCount = 0;
      let paidCount = 0;
      for (const reg of registrations) {
        if (reg.userId && paidUserIds.has(reg.userId)) paidCount++;
        else freeCount++;
      }
      if (freeCount >= 4 && paidCount < 2) {
        await unrufld.asServiceRole.entities.User.update(user.id, { account_status: 'suspended' });
      }
    } catch {}

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}