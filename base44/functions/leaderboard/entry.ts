import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { INSFORGE_BASE_URL, authHeaders, buildQuery } from "../../shared/insforge.ts";

// Real smile leaderboard. Reads every scan + the users mirror (server-side, via
// the InsForge service token), computes each user's Smile MMR with the same
// formula as the client gamification engine, and returns the ranked rows.
// Display names only — emails and raw scores never leave the server.
async function callInsforge(path, init = {}) {
  const headers = { ...authHeaders(), ...(init.headers || {}) };
  const res = await fetch(`${INSFORGE_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return { ok: res.ok, status: res.status, data };
}

function dayKey(d) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

function computeStreak(dates) {
  if (!dates.length) return 0;
  const set = new Set(dates.map((d) => dayKey(new Date(d))));
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  if (!set.has(dayKey(cur))) {
    const y = new Date(cur);
    y.setDate(y.getDate() - 1);
    if (!set.has(dayKey(y))) return 0;
    cur.setDate(cur.getDate() - 1);
  }
  let s = 0;
  while (set.has(dayKey(cur))) { s++; cur.setDate(cur.getDate() - 1); }
  return s;
}

function computeMMR(rows, streak) {
  let mmr = 0;
  mmr += Math.min(rows.length * 15, 300);
  const avgScore = rows.length ? rows.reduce((a, r) => a + (r.score || 0), 0) / rows.length : 0;
  mmr += avgScore * 5;
  if (rows.length >= 2) mmr += Math.max(0, (rows[0]?.score || 0) - (rows[rows.length - 1]?.score || 0)) * 8;
  mmr += streak * 25;
  const avgHealth = rows.length ? rows.reduce((a, r) => a + (r.dental_health_score || 0), 0) / rows.length : 0;
  mmr += avgHealth * 3;
  return Math.round(mmr);
}

export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);
    const user = await unrufld.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const period = body.period || "all"; // "today" | "week" | "month" | "all"

    // Strava-style time filter: only count scans within the selected period.
    // "all" uses every scan ever; the others window from now backwards.
    const now = new Date();
    let threshold = null;
    if (period === "today") {
      threshold = new Date(now); threshold.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      threshold = new Date(now.getTime() - 7 * 86400000);
    } else if (period === "month") {
      threshold = new Date(now.getTime() - 30 * 86400000);
    }

    const [sRes, uRes] = await Promise.all([
      callInsforge(`/api/database/records/scans?${buildQuery({}, { order: { column: "created_at", ascending: false }, limit: 10000 })}`),
      callInsforge(`/api/database/records/users?${buildQuery({}, { limit: 10000 })}`),
    ]);
    const allScans = sRes.ok && Array.isArray(sRes.data) ? sRes.data : [];
    const scans = threshold
      ? allScans.filter((s) => new Date(s.created_at || (s.data && s.data.created_date) || 0) >= threshold)
      : allScans;
    const mirror = uRes.ok && Array.isArray(uRes.data) ? uRes.data : [];

    const byUser = {};
    for (const s of scans) {
      const uid = s.userId || (s.data && s.data.user_id);
      if (!uid) continue;
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push({
        score: s.score ?? (s.data && s.data.score) ?? 0,
        dental_health_score: s.dental_health_score ?? (s.data && s.data.dental_health_score) ?? 0,
        created_at: s.created_at,
      });
    }

    // PRIVACY: Never use full_name (Google OAuth real name) on the public
    // leaderboard. Only explicitly-chosen display_name → username → anonymous.
    // Exposing full_name links a real person to their dental-health data.
    const nameFor = {};
    const historyFor = {};
    const optOut = new Set();
    const base44ToInsforge = {};
    const norm = (s) => String(s || "").trim().toLowerCase();
    // Build the Base44→InsForge ID map first so the authoritative Base44
    // display_name can be applied to the correct InsForge-keyed row.
    for (const m of mirror) {
      const insforgeId = m.userId || (m.data && m.data.user_id);
      const base44Id = m.data && m.data.user_id;
      if (insforgeId && base44Id) base44ToInsforge[base44Id] = insforgeId;
    }
    // Seed names from the InsForge mirror (display_name / username).
    for (const m of mirror) {
      const id = m.userId || (m.data && m.data.user_id);
      if (!id) continue;
      const d = m.data || {};
      const realName = norm(m.fullName || d.full_name);
      const chosenDisplay = d.display_name && norm(d.display_name) !== realName ? d.display_name : null;
      const display = chosenDisplay || d.username;
      if (display) nameFor[id] = display;
      if (d.leaderboard_opt_out === true) optOut.add(id);
      if (Array.isArray(d.username_history) && d.username_history.length) {
        historyFor[id] = d.username_history.filter(Boolean).slice(-5);
      }
    }
    // Override with the authoritative Base44 User entity (the source Profile
    // updates), mapped to InsForge IDs. Base44 is fresher than the mirror —
    // this is what keeps the leaderboard current when a user renames (the
    // mirror can lag behind Base44, which previously showed stale names).
    try {
      const users = await unrufld.asServiceRole.entities.User.list('-created_date', 10000);
      for (const u of (users || [])) {
        if (!u.id) continue;
        const insforgeId = base44ToInsforge[u.id] || u.id;
        const realName = norm(u.full_name);
        const chosenDisplay = u.display_name && norm(u.display_name) !== realName ? u.display_name : null;
        const name = chosenDisplay || u.username || "";
        if (name) nameFor[insforgeId] = name;
        if (u.leaderboard_opt_out === true) optOut.add(insforgeId);
        if (!historyFor[insforgeId] && Array.isArray(u.username_history) && u.username_history.length) {
          historyFor[insforgeId] = u.username_history.filter(Boolean).slice(-5);
        }
      }
    } catch {}
    // Anonymous fallback for anyone still unnamed — never their real name.
    for (const uid of Object.keys(byUser)) {
      if (!nameFor[uid]) nameFor[uid] = "teewai smiler";
    }
    const myInsforgeId = base44ToInsforge[user.id] || user.id;
    const amOptedOut = optOut.has(myInsforgeId) || optOut.has(user.id);

    // Opted-out users are excluded from the public ranking entirely.
    const rows = Object.entries(byUser)
      .filter(([uid]) => !optOut.has(uid))
      .map(([uid, list]) => {
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const streak = computeStreak(list.map((r) => r.created_at));
        const mmr = computeMMR(list, streak);
        return {
          user_id: uid,
          name: (uid === myInsforgeId && user.username) ? user.username : (nameFor[uid] || "teewai smiler"),
          prev_names: historyFor[uid] || [],
          mmr,
          scans: list.length,
          isUser: uid === myInsforgeId,
        };
      }).sort((a, b) => b.mmr - a.mmr);

    const idx = rows.findIndex((r) => r.isUser);
    const myPosition = !amOptedOut && idx >= 0 ? idx + 1 : null;
    const me = amOptedOut
      ? { user_id: user.id, name: nameFor[myInsforgeId] || user.username || "teewai smiler", mmr: 0, scans: 0, isUser: true, optedOut: true }
      : (idx >= 0 ? rows[idx] : (user.id ? { user_id: user.id, name: nameFor[myInsforgeId] || user.username || "teewai smiler", mmr: 0, scans: 0, isUser: true } : null));

    // Local Legend — most scans in the period (consistency, not speed).
    // Strava's Local Legend rewards frequency; teewai's rewards scan habit.
    const consistency = [...rows].sort((a, b) => b.scans - a.scans).slice(0, 3);

    return Response.json({ rows: rows.slice(0, 50), myPosition, total: rows.length, me, consistency });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}