// Shared rate limiter backed by the InsForge `rate_limit_attempts` table so
// limits persist across Worker instances. Reused by communityPost (and
// available to any backend function that needs per-key + per-IP throttling).
//
// `enforceRateLimit` checks the current count for `key` (and `ip` at 3x) and,
// if under the limit, records the attempt so subsequent calls count toward it.
// Fails open on infra error — a rate-limit outage must never block a
// legitimate action.

import { ensureTable, countRecords, insertRecords, deleteRecords } from "./insforgeRateLimit.ts";

let tableEnsured = false;
const TABLE = "rate_limit_attempts";

async function ensure() {
  if (tableEnsured) return;
  tableEnsured = true;
  await ensureTable(TABLE, [
    { columnName: "bucket", type: "string", isUnique: false, isNullable: false },
    { columnName: "key", type: "string", isUnique: false, isNullable: false },
    { columnName: "ip", type: "string", isUnique: false, isNullable: false },
    { columnName: "at", type: "string", isUnique: false, isNullable: false },
  ]);
}

// Returns { allowed: boolean, retryAfter: number }. When allowed, the attempt
// is recorded. `ip` may be "unknown". `max` is per key; IP is capped at max*3.
export async function enforceRateLimit(
  bucket: string,
  key: string,
  ip: string,
  max: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  try {
    await ensure();
    const cutoff = new Date(Date.now() - windowMs).toISOString();
    // Opportunistic cleanup: delete records older than 2x the window to keep
    // the table bounded (a growing table is itself a DOS vector).
    const cleanup = new Date(Date.now() - windowMs * 2).toISOString();
    deleteRecords(TABLE, { bucket, at: { lt: cleanup } });
    const keyCount = await countRecords(TABLE, { bucket, key, at: { gte: cutoff } });
    const ipCount = ip && ip !== "unknown"
      ? await countRecords(TABLE, { bucket, ip, at: { gte: cutoff } }, 300)
      : 0;
    if (keyCount >= max || ipCount >= max * 3) {
      return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
    }
    await insertRecords(TABLE, [{ bucket, key, ip: ip || "unknown", at: new Date().toISOString() }]);
    return { allowed: true, retryAfter: 0 };
  } catch {
    // Fail open — never block a legitimate action due to a rate-limit error.
    return { allowed: true, retryAfter: 0 };
  }
}