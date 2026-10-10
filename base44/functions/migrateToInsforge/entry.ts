import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { callInsforge, ensureTable } from "../../shared/insforgeRateLimit.ts";
import { INSFORGE_BASE_URL, insforgeToken, buildQuery } from "../../shared/insforge.ts";

// One-time migration: moves remaining Base44 app-data records into InsForge
// and re-hosts legacy Base44 food photos into the private InsForge food-scans
// bucket. Admin-only. Idempotent — fetches each InsForge table once and dedups
// locally (no per-record fetch), then bulk-inserts the new rows in one call.
//
// After this runs and the report is verified, the Base44 entities can be purged
// (except User + auth sessions, which stay on Base44 by design).

const FOOD_BUCKET = "food-scans";

const MIGRATIONS = [
  {
    entity: "DiscoveredFood", table: "discovered_foods",
    keyField: "name_key", keyCol: "nameKey",
    cols: { name_key: "nameKey", name: "name", category: "category" },
    ownerField: "created_by_id", ownerCol: "userId",
    ensure: [
      { columnName: "nameKey", type: "string", isUnique: true, isNullable: false },
      { columnName: "name", type: "string", isUnique: false, isNullable: false },
      { columnName: "category", type: "string", isUnique: false, isNullable: false },
      { columnName: "userId", type: "string", isUnique: false, isNullable: true },
      { columnName: "data", type: "json", isUnique: false, isNullable: true },
    ],
  },
  {
    entity: "Subscription", table: "subscriptions",
    keyField: "created_by_id", keyCol: "userId",
    cols: { user_id: "userId", plan: "plan", status: "status", scans_used: "scansUsed", scans_limit: "scansLimit" },
    ownerField: "created_by_id", ownerCol: "userId",
  },
  {
    entity: "Notification", table: "notifications",
    keyField: "user_id", keyCol: "userId",
    cols: { user_id: "userId", read: "read", type: "type" },
  },
  {
    entity: "HomeWhiteningMethod", table: "home_whitening_methods",
    keyField: "name", keyCol: "name",
    cols: { name: "name", category: "category", sort_order: "sortOrder" },
  },
  {
    entity: "IpRegistration", table: "ip_registrations",
    keyField: "user_id", keyCol: "userId",
    cols: { ip_address: "ipAddress", user_email: "userEmail", user_id: "userId", username: "username" },
  },
  {
    entity: "ZeroScanNudge", table: "zero_scan_nudges",
    keyField: "user_email", keyCol: "userEmail",
    cols: { user_email: "userEmail", nudge_count: "nudgeCount", last_sent: "lastSent" },
  },
  {
    entity: "Tip", table: "tips",
    keyField: "id", keyCol: "id",
    cols: { slug: "slug", title: "title", active: "active", sort_order: "sortOrder", audience: "audience", category: "category" },
    ensure: [
      { columnName: "slug", type: "string", isUnique: false, isNullable: true },
      { columnName: "title", type: "string", isUnique: false, isNullable: true },
      { columnName: "active", type: "boolean", isUnique: false, isNullable: true },
      { columnName: "sortOrder", type: "integer", isUnique: false, isNullable: true },
      { columnName: "audience", type: "string", isUnique: false, isNullable: true },
      { columnName: "category", type: "string", isUnique: false, isNullable: true },
      { columnName: "data", type: "json", isUnique: false, isNullable: true },
    ],
  },
  {
    entity: "FreeScanUsage", table: "free_scan_usage",
    keyField: "key_value", keyCol: "keyValue",
    cols: { key_type: "keyType", key_value: "keyValue", scans_used: "scansUsed", last_scan: "lastScan", ip_address: "ipAddress" },
    ensure: [
      { columnName: "keyType", type: "string", isUnique: false, isNullable: true },
      { columnName: "keyValue", type: "string", isUnique: true, isNullable: false },
      { columnName: "scansUsed", type: "integer", isUnique: false, isNullable: true },
      { columnName: "lastScan", type: "string", isUnique: false, isNullable: true },
      { columnName: "ipAddress", type: "string", isUnique: false, isNullable: true },
      { columnName: "data", type: "json", isUnique: false, isNullable: true },
    ],
  },
  {
    entity: "GuestScan", table: "guest_scans",
    keyField: "id", keyCol: "id",
    cols: { device_hash: "deviceHash", ip_address: "ipAddress", scanned_at: "scannedAt" },
    ensure: [
      { columnName: "deviceHash", type: "string", isUnique: false, isNullable: true },
      { columnName: "ipAddress", type: "string", isUnique: false, isNullable: true },
      { columnName: "scannedAt", type: "string", isUnique: false, isNullable: true },
      { columnName: "data", type: "json", isUnique: false, isNullable: true },
    ],
  },
  {
    entity: "DeviceFingerprint", table: "device_fingerprints",
    keyField: "id", keyCol: "id",
    cols: { device_hash: "deviceHash", user_id: "userId", user_email: "userEmail", ip_address: "ipAddress", is_paid: "isPaid" },
    ensure: [
      { columnName: "deviceHash", type: "string", isUnique: false, isNullable: false },
      { columnName: "userId", type: "string", isUnique: false, isNullable: true },
      { columnName: "userEmail", type: "string", isUnique: false, isNullable: true },
      { columnName: "ipAddress", type: "string", isUnique: false, isNullable: true },
      { columnName: "isPaid", type: "boolean", isUnique: false, isNullable: true },
      { columnName: "data", type: "json", isUnique: false, isNullable: true },
    ],
  },
];

const RESERVED = new Set([
  "id", "created_date", "updated_date", "created_by_id", "app_id", "entity_name",
  "is_sample", "is_deleted", "deleted_date", "app_delete_op_id", "environment",
  "created_by", "data",
]);

function buildRow(rec: any, cfg: any) {
  const row: any = { data: {} };
  for (const [entField, colField] of Object.entries(cfg.cols)) {
    if (rec[entField] !== undefined) row[colField] = rec[entField];
  }
  if (cfg.ownerField && rec[cfg.ownerField] != null) row[cfg.ownerCol] = rec[cfg.ownerField];
  for (const [k, v] of Object.entries(rec)) {
    if (!cfg.cols[k] && !RESERVED.has(k) && k !== cfg.ownerField) row.data[k] = v;
  }
  return row;
}

export default async function (req: Request) {
  const unrufld = createClientFromRequest(req);
  const user = await unrufld.auth.me().catch(() => null);
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }
  const report: any = { migrations: {}, foodPhotos: { scanned: 0, migrated: 0, failed: 0 } };

  for (const cfg of MIGRATIONS) {
    const entry: any = { base44: 0, migrated: 0, skipped: 0, insforgeBefore: 0 };
    if (cfg.ensure) {
      try { await ensureTable(cfg.table, cfg.ensure); }
      catch (e) { entry.ensureError = String((e as Error).message || e).slice(0, 160); }
    }

    // Fetch existing InsForge rows ONCE — for count + local dedup.
    let existing: any[] = [];
    try {
      const r = await callInsforge(`/api/database/records/${cfg.table}?${buildQuery({}, { limit: 1000 })}`);
      if (r.ok && Array.isArray(r.data)) existing = r.data;
      entry.insforgeBefore = existing.length;
    } catch { entry.insforgeBefore = -1; }

    const existingKeys = new Set<string>();
    if (cfg.keyCol) {
      for (const row of existing) {
        const v = row[cfg.keyCol];
        if (v != null) existingKeys.add(String(v));
      }
    }

    let recs: any[] = [];
    try {
      recs = (await unrufld.asServiceRole.entities[cfg.entity].list("-created_date", 1000)) || [];
    } catch (e) {
      entry.error = String((e as Error).message || e).slice(0, 160);
      report.migrations[cfg.entity] = entry;
      continue;
    }
    entry.base44 = recs.length;

    const toInsert: any[] = [];
    for (const rec of recs) {
      if (cfg.keyCol && cfg.keyField) {
        const keyVal = rec[cfg.keyField];
        if (keyVal != null && existingKeys.has(String(keyVal))) { entry.skipped++; continue; }
      }
      toInsert.push(buildRow(rec, cfg));
    }
    if (toInsert.length) {
      try {
        await callInsforge(`/api/database/records/${cfg.table}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify(toInsert),
        });
        entry.migrated = toInsert.length;
      } catch (e) {
        entry.failed = toInsert.length;
        entry.lastError = String((e as Error).message || e).slice(0, 160);
      }
    }
    report.migrations[cfg.entity] = entry;
  }

  // --- Legacy food photos: StainLog image_url (Base44 public URL) -> InsForge ---
  try {
    const logsRes = await callInsforge(`/api/database/records/stain_logs?${buildQuery({}, { limit: 1000 })}`);
    const logs = logsRes.ok && Array.isArray(logsRes.data) ? logsRes.data : [];
    for (const row of logs) {
      const d = row.data || {};
      const url = d.image_url;
      if (!url || /\/api\/storage\/buckets\//.test(url) || !/^https?:\/\//.test(url)) continue;
      report.foodPhotos.scanned++;
      try {
        const imgRes = await fetch(url);
        if (!imgRes.ok) { report.foodPhotos.failed++; continue; }
        const blob = await imgRes.blob();
        const ext = (String(url).split(".").pop() || "jpg").split("?")[0].replace(/[^a-z0-9]/gi, "").slice(0, 4) || "jpg";
        const key = `u/${row.userId}/food/migrated_${row.id}.${ext}`;
        const form = new FormData();
        form.append("file", new Blob([blob]), key);
        const upRes = await fetch(`${INSFORGE_BASE_URL}/api/storage/buckets/${FOOD_BUCKET}/objects/${encodeURIComponent(key)}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${insforgeToken()}` },
          body: form,
        });
        if (!upRes.ok) { report.foodPhotos.failed++; continue; }
        const newUrl = `${INSFORGE_BASE_URL}/api/storage/buckets/${FOOD_BUCKET}/objects/${encodeURIComponent(key)}`;
        await callInsforge(`/api/database/records/stain_logs?${buildQuery({ id: row.id })}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({ data: { ...d, image_url: newUrl } }),
        });
        report.foodPhotos.migrated++;
      } catch {
        report.foodPhotos.failed++;
      }
    }
  } catch (e) {
    report.foodPhotos.error = String((e as Error).message || e).slice(0, 160);
  }

  return Response.json(report);
}