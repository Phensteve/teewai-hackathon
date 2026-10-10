import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { INSFORGE_BASE_URL, authHeaders, buildQuery } from "../../shared/insforge.ts";
import { zeroScanEmailHtml, packNudgeEmailHtml } from "../../shared/nudgeEmails.ts";

// Nudges users who signed up but never scanned. Runs weekly via the
// ZeroScanNudge workflow (action: "scheduled") with built-in anti-spam rules:
// account must be ≥3 days old, at most 3 nudges per user, spaced ≥7 days apart
// (tracked in the ZeroScanNudge entity). Manual admin actions: "packNudge"
// (one-off pack email to a specific address) and "dryRun".

const MAX_NUDGES = 3;
const MIN_GAP_MS = 7 * 24 * 60 * 60 * 1000; // 7 days between nudges
const MIN_ACCOUNT_AGE_MS = 3 * 24 * 60 * 60 * 1000; // let new users settle in

function base64url(str: string) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function insforge(path: string, init: any = {}) {
  const headers = { ...authHeaders(), ...(init.headers || {}) };
  const res = await fetch(`${INSFORGE_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function sendMail(accessToken: string, to: string, subject: string, html: string) {
  const raw = [
    `From: teewai <notifications@teewai.app>`,
    `To: <${to}>`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    html,
  ].join("\r\n");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64url(raw) }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data?.error?.message || null };
}

// Users with zero scans (checks both Base44 and InsForge scan ownership ids).
async function findZeroScanUsers(unrufld: any) {
  const [users, scans, mirror] = await Promise.all([
    unrufld.asServiceRole.entities.User.list("-created_date", 10000),
    insforge(`/api/database/records/scans?${buildQuery({}, { limit: 10000 })}`),
    insforge(`/api/database/records/users?${buildQuery({}, { limit: 10000 })}`),
  ]);
  const scanRows = Array.isArray(scans) ? scans : [];
  const mirrorRows = Array.isArray(mirror) ? mirror : [];

  const scannedIds = new Set<string>();
  for (const s of scanRows) {
    const uid = s.userId || (s.data && s.data.user_id);
    if (uid) scannedIds.add(String(uid));
  }
  const insforgeIdFor: Record<string, string> = {};
  for (const m of mirrorRows) {
    const b44 = m.data && m.data.user_id;
    if (b44 && m.userId) insforgeIdFor[String(b44)] = String(m.userId);
  }
  return (users || []).filter((u: any) => {
    if (!u.email || u.account_status === "deleted" || u.account_status === "suspended") return false;
    const ids = [String(u.id), insforgeIdFor[String(u.id)]].filter(Boolean);
    return !ids.some((id) => scannedIds.has(id));
  });
}

export default async function (req: Request) {
  try {
    const unrufld = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "scheduled";

    // --- Automated weekly nudge (invoked by the ZeroScanNudge workflow) -----
    if (action === "scheduled") {
      const now = Date.now();
      const targets = await findZeroScanUsers(unrufld);
      const logs = await insforge(`/api/database/records/zero_scan_nudges?${buildQuery({}, { order: { column: "created_at", ascending: false }, limit: 10000 })}`) || [];
      const logByEmail: Record<string, any> = {};
      for (const l of logs) logByEmail[l.userEmail] = l;

      const due = targets.filter((u: any) => {
        if (now - new Date(u.created_date).getTime() < MIN_ACCOUNT_AGE_MS) return false;
        const log = logByEmail[u.email];
        if (!log) return true;
        if ((log.nudgeCount || 0) >= MAX_NUDGES) return false;
        return now - new Date(log.lastSent || 0).getTime() >= MIN_GAP_MS;
      });
      if (body.dryRun) return Response.json({ eligible: due.length });
      if (!due.length) return Response.json({ sent: 0, skipped: targets.length });

      const { accessToken } = await unrufld.asServiceRole.connectors.getConnection("gmail");
      let sent = 0;
      let failed = 0;
      let pushed = 0;
      for (const u of due) {
        const name = u.display_name || u.username || u.full_name || u.email.split("@")[0];
        const r = await sendMail(accessToken, u.email, "Your teeth need this 🦷 — your first teewai scan is waiting", zeroScanEmailHtml(name));
        if (!r.ok) { failed++; continue; }
        sent++;
        // Best-effort native push (reaches the teewai mobile app with push
        // credentials configured; silently no-ops on web / unconfigured builds).
        try {
          await unrufld.asServiceRole.integrations.Core.SendPushNotification({
            user_id: u.id,
            title: "Your first scan is waiting",
            content: "Tap to scan your smile — it takes seconds.",
            action_label: "Scan now",
            action_url: "https://teewai.app/scan",
          });
          pushed++;
        } catch {}
        const log = logByEmail[u.email];
        if (log) {
          await insforge(`/api/database/records/zero_scan_nudges?${buildQuery({ id: log.id })}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Prefer: "return=representation" },
            body: JSON.stringify({
              nudgeCount: (log.nudgeCount || 0) + 1,
              lastSent: new Date().toISOString(),
            }),
          });
        } else {
          await insforge(`/api/database/records/zero_scan_nudges`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Prefer: "return=representation" },
            body: JSON.stringify({
              userEmail: u.email,
              nudgeCount: 1,
              lastSent: new Date().toISOString(),
            }),
          });
        }
      }
      return Response.json({ sent, failed, pushed, skipped: targets.length - due.length });
    }

    // --- Manual admin actions ------------------------------------------------
    const me = await unrufld.auth.me().catch(() => null);
    if (!me || me.role !== "admin") return Response.json({ error: "Unauthorized" }, { status: 401 });

    if (action === "packNudge") {
      const to = body.email;
      if (!to) return Response.json({ error: "email is required" }, { status: 400 });
      const { accessToken } = await unrufld.asServiceRole.connectors.getConnection("gmail");
      const name = (to.split("@")[0] || "").trim();
      const r = await sendMail(accessToken, to, "A little nudge from teewai 🦷", packNudgeEmailHtml(name));
      return Response.json({ ok: r.ok, error: r.error });
    }

    if (action === "dryRun") {
      const targets = await findZeroScanUsers(unrufld);
      return Response.json({ count: targets.length, emails: targets.map((u: any) => u.email) });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}