import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { buildQuery } from "../../shared/insforge.ts";
import { callInsforge } from "../../shared/insforgeRateLimit.ts";
import { loadHabitLogs, computeHabitEstimate } from "../../shared/habitEstimate.ts";

// Habit Estimate — computes the user's extrapolated whiteness score from their
// latest real scan + all stain_logs (brush, water, mouthwash, food) logged since
// that scan. Returns a color-coded breakdown so the dashboard, shade graph, and
// Ask Teewai all share one deterministic wellness model.
//
// Scan measurements are NEVER written or adjusted by this function. The
// estimate is a read-only projection that resets to the real score on each new
// scan. Used by the Enamel Bloom care-logging sheet and the Ask Teewai prompt.

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Load the user's latest real scan (the estimate anchor).
    const sRes = await callInsforge(
      `/api/database/records/scans?${buildQuery(
        { userId: { eq: user.id } },
        { select: "data,created_at", order: { column: "created_at", ascending: false }, limit: 1 }
      )}`
    );
    const rawScans = sRes.ok && Array.isArray(sRes.data) ? sRes.data : [];
    const latestScan = rawScans[0] || null;
    if (!latestScan) return Response.json({ estimate: null });

    // Load all stain_logs since the anchor scan (brush, water, food, etc.).
    const scanDate = latestScan.created_at || (latestScan.data || {}).created_date;
    const logs = await loadHabitLogs(user.id, scanDate);
    const estimate = computeHabitEstimate(latestScan, logs);
    return Response.json({ estimate });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}