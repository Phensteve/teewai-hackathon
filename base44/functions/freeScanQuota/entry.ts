import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getClientIp } from '../../shared/ipUtils.ts';
import { FreeScanUsage, GuestScan } from '../../shared/securityInsforge.ts';

// Server-side guest free-scan allowance. Counted per device fingerprint
// (survives cleared history / incognito) AND per network IP (a looser cap so
// shared Wi-Fi isn't punished, but fingerprint spoofing still hits a wall).
const DEVICE_LIMIT = 3;
const IP_LIMIT = 6;

async function getRow(db: any, key_type: string, key_value: string) {
  const rows = await db.filter({ key_type, key_value }, '-updated_date', 1);
  return rows[0] || null;
}

export default async function(req: Request) {
  const db = FreeScanUsage;
  const body = await req.json().catch(() => ({}));
  const action = body.action === 'consume' ? 'consume' : 'check';
  const device = String(body.device_hash || '').slice(0, 128);
  const ip = getClientIp(req);

  const deviceRow = device ? await getRow(db, 'device', device) : null;
  const ipRow = ip && ip !== 'unknown' ? await getRow(db, 'ip', ip) : null;
  let deviceUsed = deviceRow?.scans_used || 0;
  let ipUsed = ipRow?.scans_used || 0;
  const remainingNow = () => Math.max(0, Math.min(DEVICE_LIMIT - deviceUsed, IP_LIMIT - ipUsed));

  if (action === 'consume') {
    if (remainingNow() <= 0) {
      return Response.json({ allowed: false, used: DEVICE_LIMIT, remaining: 0, limit: DEVICE_LIMIT });
    }
    const now = new Date().toISOString();
    if (device) {
      deviceUsed++;
      if (deviceRow) await db.update(deviceRow.id, { scans_used: deviceUsed, last_scan: now, ip_address: ip });
      else await db.create({ key_type: 'device', key_value: device, scans_used: 1, last_scan: now, ip_address: ip });
    }
    if (ip && ip !== 'unknown') {
      ipUsed++;
      if (ipRow) await db.update(ipRow.id, { scans_used: ipUsed, last_scan: now });
      else await db.create({ key_type: 'ip', key_value: ip, scans_used: 1, last_scan: now, ip_address: ip });
    }
  }

  // Record that this guest scan was taken (device + IP + timestamp only —
  // not the scan result, per privacy preference).
  if (action === 'consume' && body.record !== false) {
    try {
      const guestDb = GuestScan;
      await guestDb.create({
        device_hash: device || 'unknown',
        ip_address: ip || 'unknown',
        scanned_at: new Date().toISOString(),
      });
    } catch { /* non-fatal — quota still works */ }
  }

  const remaining = remainingNow();
  return Response.json({ allowed: remaining > 0, used: DEVICE_LIMIT - remaining, remaining, limit: DEVICE_LIMIT });
}