import { callInsforge, ensureTable, insertRecords, deleteRecords } from "../../shared/insforgeRateLimit.ts";
import { buildQuery } from "../../shared/insforge.ts";
import { getClientIp } from "../../shared/ipUtils.ts";

// Public visitor heartbeat endpoint. Every page in the app sends a heartbeat
// every 30s with a localStorage-stored session ID. The admin dashboard reads
// this table (via adminAuth) for the live visitor count + traffic graph.
const VISITORS_TABLE = "site_visitors";
let tableEnsured = false;

async function ensureVisitorsTable() {
  if (tableEnsured) return;
  tableEnsured = true;
  await ensureTable(VISITORS_TABLE, [
    { columnName: "session_id", type: "string", isUnique: true, isNullable: false },
    { columnName: "path", type: "string", isUnique: false, isNullable: false },
    { columnName: "ip_address", type: "string", isUnique: false, isNullable: false },
    { columnName: "first_seen", type: "string", isUnique: false, isNullable: false },
    { columnName: "last_seen", type: "string", isUnique: false, isNullable: false },
  ]);
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { op, session_id, path } = body;

    if (op === "heartbeat") {
      await ensureVisitorsTable();
      if (!session_id) return Response.json({ error: "session_id required" }, { status: 400 });
      const now = new Date().toISOString();
      const ip = getClientIp(req);
      // Upsert: update last_seen if the session exists, otherwise insert.
      const existing = await callInsforge(`/api/database/records/${VISITORS_TABLE}?${buildQuery({ session_id }, { limit: 1 })}`);
      if (existing.ok && Array.isArray(existing.data) && existing.data.length) {
        await callInsforge(`/api/database/records/${VISITORS_TABLE}?${buildQuery({ session_id })}`, {
          method: "PATCH",
          body: JSON.stringify({ last_seen: now, path: path || "/", ip_address: ip }),
        });
      } else {
        await insertRecords(VISITORS_TABLE, [{ session_id, path: path || "/", ip_address: ip, first_seen: now, last_seen: now }]);
      }
      // Cleanup sessions older than 30 days to keep the table bounded.
      const cleanupCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await deleteRecords(VISITORS_TABLE, { last_seen: { lt: cleanupCutoff } });
      return Response.json({ ok: true });
    }

    return Response.json({ error: `Unknown op "${op}"` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}