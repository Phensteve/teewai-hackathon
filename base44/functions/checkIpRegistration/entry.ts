import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getClientIp, isPaidPlan } from '../../shared/ipUtils.ts';
import { INSFORGE_BASE_URL, authHeaders, buildQuery } from '../../shared/insforge.ts';
import { DeviceFingerprint } from '../../shared/securityInsforge.ts';

// Public endpoint: checks whether a new registration should be allowed
// from the caller's IP. Blocks if 3+ free accounts exist and fewer than
// 2 are paid. Fails open on errors so legitimate users aren't locked out.

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
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}));
    const deviceHash = String(body.device_hash || '').slice(0, 128);

    // Device check — max 3 free accounts per device, regardless of network,
    // cleared storage or incognito (the fingerprint is regenerated from
    // hardware/browser traits, not stored state).
    if (deviceHash) {
      const devs = await DeviceFingerprint.filter({ device_hash: deviceHash }, '-created_date', 50);
      const freeOnDevice = devs.filter((d: any) => !d.is_paid).length;
      if (freeOnDevice >= 3) {
        return Response.json({
          allowed: false,
          reason: "This device already has 3 free teewai accounts. Please sign in to one of them, upgrade an existing account, or contact support.",
          free_count: freeOnDevice,
          paid_count: devs.length - freeOnDevice,
        });
      }
    }

    if (!ip || ip === 'unknown') {
      return Response.json({ allowed: true, reason: 'IP unavailable', free_count: 0, paid_count: 0 });
    }

    const regRes = await callInsforge(
      `/api/database/records/ip_registrations?${buildQuery({ ipAddress: ip }, { order: { column: 'created_at', ascending: false }, limit: 50 })}`
    );
    const registrations = regRes.ok && Array.isArray(regRes.data) ? regRes.data : [];

    if (registrations.length === 0) {
      return Response.json({ allowed: true, reason: 'No prior registrations', free_count: 0, paid_count: 0 });
    }

    const userIds = registrations.map((r: any) => r.userId).filter(Boolean);

    // Look up subscriptions for all prior users from this IP in one query
    const paidUserIds = new Set<string>();
    if (userIds.length > 0) {
      const subRes = await callInsforge(
        `/api/database/records/subscriptions?${buildQuery({ userId: { in: userIds } }, { limit: 10000 })}`
      );
      const subs = subRes.ok && Array.isArray(subRes.data) ? subRes.data : [];
      for (const s of subs) {
        if (isPaidPlan(s.plan)) {
          paidUserIds.add(s.userId);
        }
      }
    }

    let freeCount = 0;
    let paidCount = 0;
    for (const reg of registrations) {
      if (reg.userId && paidUserIds.has(reg.userId)) {
        paidCount++;
      } else {
        freeCount++;
      }
    }

    const blocked = freeCount >= 3 && paidCount < 2;

    return Response.json({
      allowed: !blocked,
      reason: blocked
        ? `We've detected ${freeCount} free accounts from your network. To keep teewai fair for everyone, please upgrade an existing account or contact support.`
        : 'OK',
      free_count: freeCount,
      paid_count: paidCount
    });
  } catch (error) {
    // Fail open — never block a legitimate registration due to a check error
    return Response.json({ allowed: true, reason: 'Check skipped', error: (error as Error).message });
  }
}