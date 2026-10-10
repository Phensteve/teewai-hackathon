import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { INSFORGE_BASE_URL, authHeaders, buildQuery, extractStorageKey } from "../../shared/insforge.ts";
import { callInsforge } from "../../shared/insforgeRateLimit.ts";

// Ownership-verified photo proxy for private InsForge storage buckets.
//
// Both the `teeth-scans` and `food-scans` buckets are PRIVATE — object URLs are
// not publicly fetchable, so photos (PHI) can't leak by URL. This function is
// the only way the frontend gets image bytes for display: it verifies the
// caller owns each photo, fetches the bytes from InsForge with the service
// token, and returns them as base64 data URLs (which work in <img>, canvas,
// and are same-origin so they never taint the canvas).
//
// Ownership check:
//  1. Fast path — the key starts with `u/{userId}/` (the proxy stamps this on
//     every upload), so the caller directly owns the object.
//  2. Slow path — legacy keys (`scans/…` from before the proxy was hardened)
//     have no userId in the key, so we look up the caller's scans (teeth-scans)
//     or stain logs (food-scans) and verify the photo URL is referenced by one
//     of their records.
//
// Accepts { urls: string[] } and returns { dataUrls: { [url]: dataUrl } } so a
// list page can resolve all its thumbnails in a single call.

const ALLOWED_BUCKETS = new Set(["teeth-scans", "food-scans"]);

function stripQuery(url: string): string {
  return String(url).split("?")[0];
}

// Extract the bucket name from a full InsForge object URL.
function extractBucket(url: string): string | null {
  const m = String(url).match(/\/api\/storage\/buckets\/([^/]+)\/objects\//);
  return m ? decodeURIComponent(m[1]) : null;
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  try {
    const unrufld = createClientFromRequest(req);
    const user = await unrufld.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const urls: string[] = Array.isArray(body.urls) ? body.urls : (body.url ? [body.url] : []);
    if (!urls.length) return Response.json({ dataUrls: {} });

    const prefix = `u/${user.id}/`;
    const allowed: string[] = [];
    const needLookup: string[] = [];

    for (const url of urls) {
      const bucket = extractBucket(url);
      if (!bucket || !ALLOWED_BUCKETS.has(bucket)) continue;
      const key = extractStorageKey(url);
      if (!key) continue;
      if (key.startsWith(prefix)) allowed.push(url);
      else needLookup.push(url);
    }

    // Slow path: legacy keys — verify via record ownership.
    if (needLookup.length) {
      // Group lookups by bucket so we only hit the relevant table.
      const teethNeed = needLookup.filter((u) => extractBucket(u) === "teeth-scans");
      const foodNeed = needLookup.filter((u) => extractBucket(u) === "food-scans");
      const userPhotoKeys = new Set<string>();

      if (teethNeed.length) {
        const r = await callInsforge(
          `/api/database/records/scans?${buildQuery({ userId: user.id }, { limit: 500 })}`
        );
        const rows = r.ok && Array.isArray(r.data) ? r.data : [];
        for (const row of rows) {
          const d = row.data || {};
          if (d.image_url) { const k = extractStorageKey(d.image_url); if (k) userPhotoKeys.add(k); }
          if (Array.isArray(d.image_urls)) for (const u of d.image_urls) { if (u) { const k = extractStorageKey(u); if (k) userPhotoKeys.add(k); } }
        }
      }
      if (foodNeed.length) {
        const r = await callInsforge(
          `/api/database/records/stain_logs?${buildQuery({ userId: user.id }, { limit: 500 })}`
        );
        const rows = r.ok && Array.isArray(r.data) ? r.data : [];
        for (const row of rows) {
          const d = row.data || {};
          const u = d.image_url;
          if (u) { const k = extractStorageKey(u); if (k) userPhotoKeys.add(k); }
        }
      }
      for (const url of needLookup) {
        const k = extractStorageKey(url);
        if (k && userPhotoKeys.has(k)) allowed.push(url);
      }
    }

    // Fetch bytes for all allowed URLs in parallel.
    const dataUrls: Record<string, string> = {};
    await Promise.all(allowed.map(async (url) => {
      try {
        const bucket = extractBucket(url);
        const key = extractStorageKey(url);
        if (!bucket || !key) return;
        // The InsForge storage endpoint sits behind a WAF that rejects requests
        // without a browser User-Agent (returns 403 text/html). The database
        // endpoint isn't behind this WAF, so data calls work without it — but
        // every storage GET MUST send a browser-like User-Agent or the photo
        // fetch silently 403s and photos render blank.
        const binHeaders = authHeaders();
        delete binHeaders["Content-Type"];
        const res = await fetch(
          `${INSFORGE_BASE_URL}/api/storage/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`,
          { headers: { ...binHeaders, Accept: "*/*", "User-Agent": "Mozilla/5.0 teewai" } }
        );
        if (!res.ok) return;
        const ct = (res.headers.get("content-type") || "").split(";")[0].trim() || "image/jpeg";
        // Only keep image / octet-stream bytes — skip JSON metadata responses.
        if (ct && !ct.startsWith("image/") && ct !== "application/octet-stream") return;
        const buf = await res.arrayBuffer();
        dataUrls[url] = `data:${ct};base64,${bufToB64(buf)}`;
      } catch {}
    }));

    return Response.json({ dataUrls });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});