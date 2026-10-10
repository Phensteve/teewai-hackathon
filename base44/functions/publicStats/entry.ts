import { INSFORGE_BASE_URL, authHeaders } from "../../shared/insforge.ts";

// Public app stats (no auth) — feeds the landing page's real-time scan counter
// and the active hero variant (admin-controlled override). Uses PostgREST's
// exact-count header so the scan number is the true row count and is never
// capped by a page limit.
export default async function (req) {
  try {
    const headers = authHeaders();

    // Active hero variant (admin override stored in site_settings). Best-effort:
    // if the table doesn't exist yet (no override ever set), this 404s and we
    // fall back to the code default in the landing page.
    let heroVariant = null;
    try {
      // InsForge uses PostgREST-style filters: the column must be queried with
      // an explicit operator (eq.), matching how adminAuth writes the row.
      const sr = await fetch(`${INSFORGE_BASE_URL}/api/database/records/site_settings?key=eq.hero_variant`, { headers });
      const sj = await sr.json().catch(() => null);
      if (Array.isArray(sj) && sj[0] && sj[0].value) heroVariant = sj[0].value;
    } catch {}

    const r = await fetch(
      `${INSFORGE_BASE_URL}/api/database/records/scans?select=id&limit=1`,
      { headers: { ...headers, Prefer: "count=exact" } }
    );
    // Content-Range looks like "0-0/42" — the part after the slash is the total.
    const range = r.headers.get("content-range") || "";
    const total = Number(range.split("/")[1]);
    if (Number.isFinite(total) && total >= 0) {
      return Response.json({ totalScans: total, heroVariant });
    }
    // Fallback: count via an aggregate select.
    const r2 = await fetch(
      `${INSFORGE_BASE_URL}/api/database/records/scans?select=count`,
      { headers }
    );
    const j = await r2.json().catch(() => null);
    const count = Array.isArray(j) ? Number(j[0]?.count || 0) : 0;
    return Response.json({ totalScans: count, heroVariant });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}