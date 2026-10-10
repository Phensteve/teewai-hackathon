import { buildQuery } from "./insforge.ts";
import { callInsforge } from "./insforgeRateLimit.ts";

// One deterministic wellness model for the dashboard, shade graph and assistant.
// Scan measurements are NEVER written or adjusted by this model or Bloom timers.

export function normalizeHabitLog(row: any) {
  const d = row.data || row;
  return {
    id: row.id,
    item_name: row.itemName ?? d.item_name ?? "",
    category: d.category,
    stain_level: Number(d.stain_level) || 0,
    care_action: d.care_action,
    has_water: !!d.has_water,
    image_url: d.image_url,
    created_at: row.created_at || row.created_date || d.created_at,
    log_date: row.logDate || d.log_date,
  };
}

export async function loadHabitLogs(userId: string, since?: string) {
  const filters: Record<string, any> = { userId: { eq: userId } };
  if (since) filters.created_at = { gte: since };
  const rows: any[] = [];
  for (let offset = 0; ; offset += 200) {
    const res = await callInsforge(
      `/api/database/records/stain_logs?${buildQuery(filters, {
        select: "id,itemName,logDate,data,created_at",
        order: { column: "created_at", ascending: false },
        limit: 200,
        offset,
      })}`
    );
    if (!res.ok || !Array.isArray(res.data)) throw new Error("Your saved habits could not be loaded.");
    rows.push(...res.data.map(normalizeHabitLog));
    if (!since || res.data.length < 200) break;
  }
  return rows;
}

function actionType(log: any): string {
  if (["brush", "water", "mouthwash"].includes(log.care_action)) return log.care_action;
  const name = String(log.item_name || "").toLowerCase();
  if (/brushed|brush(ed)? teeth/.test(name)) return "brush";
  if (/mouthwash/.test(name)) return "mouthwash";
  if (/^(drank water|water|plain water|water rinse|rinsed with.*water)$/.test(name)) return "water";
  return log.stain_level < 0 ? "protective" : "stain";
}

export function computeHabitEstimate(scan: any, logs: any[] = []) {
  if (!scan) return null;
  const d = scan.data || scan;
  const rawScore = scan.score ?? d.score;
  if (rawScore == null || !Number.isFinite(Number(rawScore))) return null;
  const anchorScore = Math.max(0, Math.min(100, Number(rawScore)));
  const anchorDate = scan.created_at || scan.created_date || d.created_at;
  const anchorTime = Date.parse(anchorDate);
  if (!Number.isFinite(anchorTime)) return null;

  const effects: Record<string, number> = { stain: 0, brush: 0, water: 0, mouthwash: 0, protective: 0 };
  const counts: Record<string, number> = { stain: 0, brush: 0, water: 0, mouthwash: 0, protective: 0 };
  const actions: any[] = [];
  const stains: any[] = [];
  let loss = 0;

  const relevant = logs
    .filter((l) => !String(l.id || "").startsWith("temp_") && Date.parse(l.created_at || l.created_date) >= anchorTime)
    .sort((a, b) =>
      Date.parse(a.created_at || a.created_date) - Date.parse(b.created_at || b.created_date) ||
      String(a.id).localeCompare(String(b.id))
    );

  for (const log of relevant) {
    const type = actionType(log);
    const timestamp = Date.parse(log.created_at || log.created_date);
    let amount = 0;
    counts[type]++;

    if (type === "stain") {
      amount = Math.min(anchorScore - loss, Math.max(0, Math.min(100, log.stain_level)) * 0.04 * (log.has_water ? 0.7 : 1));
      loss += amount;
      stains.push({ remaining: amount, timestamp });
      effects.stain += amount;
    } else if (type === "brush") {
      amount = loss;
      loss = 0;
      stains.forEach((s) => { s.remaining = 0; });
      effects.brush += amount;
    } else {
      const recent = [...stains].reverse().find((s) => s.remaining > 0);
      if (recent) {
        const withinWindow = timestamp - recent.timestamp <= 30 * 60000;
        const fraction = type === "mouthwash" ? (withinWindow ? 0.45 : 0.2) : (withinWindow ? 0.3 : 0.1);
        amount = type === "protective" ? Math.min(recent.remaining, Math.abs(log.stain_level) * 0.04) : recent.remaining * fraction;
        recent.remaining -= amount;
        loss = Math.max(0, loss - amount);
        effects[type] += amount;
      }
    }
    actions.push({ type, timestamp, foodName: log.item_name, stainLevel: log.stain_level, hasWater: log.has_water, mitigated: type === "stain" ? 0 : amount, degradation: type === "stain" ? amount : 0 });
  }

  const round = (n: number) => Math.round(n * 10) / 10;
  const clamp = (n: number) => round(Math.max(0, Math.min(anchorScore, n)));
  const estimate = clamp(anchorScore - loss);
  const baseNoAction = clamp(anchorScore - effects.stain);

  const projections: Record<string, any> = {
    anchorScore,
    anchorDate,
    liveEstimate: estimate,
    baseNoAction,
    stain: counts.stain ? baseNoAction : null,
  };
  for (const type of ["brush", "water", "mouthwash", "protective"]) {
    projections[type] = counts[type] ? clamp(anchorScore - effects.stain + effects[type]) : null;
  }

  return {
    anchorScore,
    anchorDate,
    anchorScanId: scan.id,
    anchorShade: scan.shade || d.shade_code || d.shade,
    estimate,
    degradation: round(loss),
    effects: Object.fromEntries(Object.entries(effects).map(([k, v]) => [k, round(v)])) as Record<string, number>,
    counts,
    projections,
    actions,
  };
}