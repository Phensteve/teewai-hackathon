import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { INSFORGE_BASE_URL, authHeaders, buildQuery } from "../../shared/insforge.ts";
import { streakEmailHtml } from "../../shared/emailTemplate.ts";

// Daily streak-keeper email. Runs on a schedule (see workflows/DailyScanReminder).
// Enumerates every user's last scan (InsForge service token) + every user's email
// (Base44 User entity, service role), then emails registered users who have
// scanned before but not today so their streak stays alive. Never emails users
// who have never scanned or who are >14 days disengaged. Returns counts only.
async function callInsforge(path, init = {}) {
  const headers = { ...authHeaders(), ...(init.headers || {}) };
  const res = await fetch(`${INSFORGE_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return { ok: res.ok, status: res.status, data };
}

export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);

    // Every scan across the platform (service token) → last scan per user.
    const sRes = await callInsforge(
      `/api/database/records/scans?${buildQuery({}, { order: { column: "created_at", ascending: false }, limit: 10000 })}`
    );
    const scans = sRes.ok && Array.isArray(sRes.data) ? sRes.data : [];

    const lastByUser = {};
    for (const s of scans) {
      const uid = s.userId || (s.data && s.data.user_id);
      if (!uid) continue;
      const d = new Date(s.created_at).getTime();
      if (!lastByUser[uid] || d > lastByUser[uid]) lastByUser[uid] = d;
    }

    // Emails + display names from the Base44 User entity (service role).
    let users = [];
    try { users = await unrufld.asServiceRole.entities.User.list("-created_date", 10000) || []; } catch {}

    const now = Date.now();
    const DAY = 86400000;
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    let sent = 0;
    let skipped = 0;
    let pushed = 0;

    for (const u of users) {
      if (!u.id || !u.email) continue;
      const last = lastByUser[u.id];
      if (last == null) { skipped++; continue; }       // never scanned — don't spam
      if (last >= todayMs) { skipped++; continue; }    // already scanned today
      const daysSince = Math.max(1, Math.floor((now - last) / DAY));
      if (daysSince > 14) { skipped++; continue; }      // disengaged — let them return

      const name = u.display_name || u.username || (u.email ? u.email.split("@")[0] : "there");

      try {
        await unrufld.integrations.Core.SendEmail({
          to: u.email,
          subject: daysSince === 1 ? "Don't lose your streak — quick scan today" : `It's been ${daysSince} days — your smile misses you`,
          body: streakEmailHtml(name, daysSince, "https://teewai.app"),
          from_name: "teewai",
        });
        sent++;
      } catch {
        skipped++; // SendEmail reaches registered users only; skip silently
      }
      // Push a native notification too (reaches users on the teewai mobile app
      // with push credentials configured). Silently no-ops on web / unconfigured
      // builds so the email remains the reliable channel.
      try {
        await unrufld.asServiceRole.integrations.Core.SendPushNotification({
          user_id: u.id,
          title: daysSince === 1 ? "Don't lose your streak" : `It's been ${daysSince} days`,
          content: daysSince === 1 ? "A quick scan today keeps your streak alive." : "Your smile misses you — tap to scan.",
          action_label: "Scan now",
          action_url: "https://teewai.app/scan",
        });
        pushed++;
      } catch {}
    }

    return Response.json({ sent, skipped, pushed, totalUsers: users.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}