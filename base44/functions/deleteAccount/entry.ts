import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { callInsforge } from "../../shared/insforgeRateLimit.ts";
import { buildQuery } from "../../shared/insforge.ts";
import { logConsent } from "../../shared/consentLog.ts";

// Full account / PHI erasure. Invoked by the user from Profile → "Delete my
// account". Permanently deletes EVERY piece of data belonging to the caller:
//   • all scan photos from storage (every object under u/<userId>/)
//   • scans, subscriptions, user_progress, stain_logs, notifications
//   • dentist_profiles, dentist_clients, appointments (as patient or dentist)
//   • the portable identity mirror row
//   • zero_scan_nudges + ip_registrations (by email and id)
//   • best-effort: the Base44 auth account itself
// Then records an "account_erasure" audit entry in the consent log.
//
// Security: the caller MUST be the authenticated account owner — verified by
// createClientFromRequest(req).auth.me(). No admin token, no cross-user
// deletion. The service token used here can touch any row, so this function
// is the ONLY place bulk user deletion is permitted; the generic insforge
// proxy blocks deletes on most of these tables for regular users.
const BUCKET = "teeth-scans";

async function deleteBy(table: string, filters: Record<string, any>): Promise<number> {
  try {
    const r = await callInsforge(
      `/api/database/records/${table}?${buildQuery(filters, { limit: 10000 })}`,
      { method: "DELETE", headers: { Prefer: "return=representation" } },
    );
    return Array.isArray(r.data) ? r.data.length : 0;
  } catch {
    return 0;
  }
}

export default async function (req: Request) {
  try {
    const unrufld = createClientFromRequest(req);
    const user = await unrufld.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;
    const email = user.email || null;
    const summary: Record<string, number> = {};

    // 1. Delete all scan photos from storage.
    //    Two sources of photo keys:
    //      a. Every object under u/<userId>/ (the proxy's namespaced uploads).
    //      b. Legacy keys (scans/…) referenced by this user's scan records —
    //         these pre-date the proxy hardening and aren't under the user
    //         prefix, so the prefix listing alone would orphan them (PHI leak).
    //    Collect (b) from the scan records BEFORE deleting them, then delete
    //    both key sets from storage.
    const stripQuery = (u: string) => String(u).split("?")[0];
    const keyFromUrl = (u: string) => {
      const marker = "/objects/";
      const idx = String(u).indexOf(marker);
      if (idx < 0) return null;
      return decodeURIComponent(String(u).slice(idx + marker.length));
    };
    const legacyKeys = new Set<string>();
    try {
      const scanRows = await callInsforge(
        `/api/database/records/scans?${buildQuery({ userId }, { limit: 10000 })}`
      );
      const rows = scanRows.ok && Array.isArray(scanRows.data) ? scanRows.data : [];
      for (const row of rows) {
        const d = row.data || {};
        for (const u of [d.image_url, ...(Array.isArray(d.image_urls) ? d.image_urls : [])]) {
          if (!u) continue;
          const key = keyFromUrl(stripQuery(u));
          if (key && !key.startsWith(`u/${userId}/`)) legacyKeys.add(key);
        }
      }
    } catch {}

    const deleteKey = async (key: string) => {
      try {
        await callInsforge(`/api/storage/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`, { method: "DELETE" });
        return true;
      } catch {
        return false;
      }
    };

    let photos = 0;
    // 1a. Legacy photo objects (referenced by scan records, not under prefix).
    for (const key of legacyKeys) if (await deleteKey(key)) photos++;
    // 1b. Every object under u/<userId>/ (namespaced uploads — safety net that
    //     also catches any photos not referenced by a scan record).
    try {
      const prefix = `u/${userId}/`;
      let offset = 0;
      for (let page = 0; page < 50; page++) {
        const qs = new URLSearchParams({ prefix, limit: "1000", offset: String(offset) });
        const r = await callInsforge(`/api/storage/buckets/${BUCKET}/objects?${qs.toString()}`);
        if (!r.ok || !Array.isArray(r.data)) break;
        const items = r.data;
        for (const obj of items) {
          const key = obj.key || obj.name;
          if (key && (await deleteKey(key))) photos++;
        }
        if (items.length < 1000) break;
        offset += 1000;
      }
    } catch {}
    summary.photos = photos;

    // 2. Delete every InsForge table row belonging to this user.
    summary.scans = await deleteBy("scans", { userId });
    summary.subscriptions = await deleteBy("subscriptions", { userId });
    summary.user_progress = await deleteBy("user_progress", { userId });
    summary.stain_logs = await deleteBy("stain_logs", { userId });
    summary.notifications = await deleteBy("notifications", { userId });
    summary.dentist_profiles = await deleteBy("dentist_profiles", { userId });
    summary.dentist_clients = await deleteBy("dentist_clients", { dentistId: userId });
    summary.appointments =
      (await deleteBy("appointments", { patientEmail: email })) +
      (await deleteBy("appointments", { dentistId: userId }));
    summary.identity_mirror = await deleteBy("users", { userId });
    summary.zero_scan_nudges = await deleteBy("zero_scan_nudges", { userEmail: email });
    summary.ip_registrations =
      (await deleteBy("ip_registrations", { userEmail: email })) +
      (await deleteBy("ip_registrations", { userId }));

    // 3. Audit: record the erasure event in the consent log.
    await logConsent(req, user, "account_erasure", JSON.stringify(summary));

    // 4. Best-effort: delete the Base44 auth account itself. The platform may
    //    not permit it; if not, all PHI is already erased above and the client
    //    logs out regardless. Never fail the whole erasure on this step.
    let authAccountDeleted = false;
    try {
      await unrufld.asServiceRole.entities.User.delete(userId);
      authAccountDeleted = true;
    } catch {}

    return Response.json({ ok: true, userId, authAccountDeleted, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}