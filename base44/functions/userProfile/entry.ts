import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { ensureTable, countRecords, insertRecords, deleteRecords } from "../../shared/insforgeRateLimit.ts";
import { getClientIp } from "../../shared/ipUtils.ts";

// Cross-user profile helpers that need a service-role view of the User table.
// Used by the signup flow to check username availability before registering.
//
// SECURITY: resolveUsername and checkUsername are rate-limited per-IP server-side
// to prevent username enumeration and email harvesting at scale. An attacker
// who bypasses the client-side rate limiter can still only make 20 requests
// per 15 minutes per IP.

const PROFILE_ATTEMPTS_TABLE = "profile_lookup_attempts";
const PROFILE_RATE_MAX = 20;
const PROFILE_RATE_WINDOW_MS = 15 * 60 * 1000;

let profileTableEnsured = false;

async function ensureProfileTable() {
  if (profileTableEnsured) return;
  profileTableEnsured = true;
  await ensureTable(PROFILE_ATTEMPTS_TABLE, [
    { columnName: "ip_address", type: "string", isUnique: false, isNullable: false },
    { columnName: "op", type: "string", isUnique: false, isNullable: false },
    { columnName: "attempted_at", type: "string", isUnique: false, isNullable: false },
  ]);
}

async function checkProfileRate(ip: string, op: string): Promise<boolean> {
  try {
    await ensureProfileTable();
    const cutoff = new Date(Date.now() - PROFILE_RATE_WINDOW_MS).toISOString();
    // Opportunistic cleanup
    deleteRecords(PROFILE_ATTEMPTS_TABLE, { attempted_at: { lt: cutoff } });
    const count = await countRecords(PROFILE_ATTEMPTS_TABLE, { ip_address: ip, op, attempted_at: { gte: cutoff } });
    return count < PROFILE_RATE_MAX;
  } catch {
    return true; // fail open
  }
}

async function logProfileAttempt(ip: string, op: string) {
  try {
    await ensureProfileTable();
    await insertRecords(PROFILE_ATTEMPTS_TABLE, [{ ip_address: ip || "unknown", op, attempted_at: new Date().toISOString() }]);
  } catch {}
}

export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { op } = body;
    const ip = getClientIp(req);

    if (op === "earlyAdopter") {
      // Server-side first-50 check. The old client-side version read a
      // user-scoped mirror list, so EVERY user saw themselves at index 0
      // and got told they were "teewai user #1".
      const me = await unrufld.auth.me().catch(() => null);
      if (!me?.id) return Response.json({ isEarly: false });
      const first50 = await unrufld.asServiceRole.entities.User.list("created_date", 50);
      const idx = (Array.isArray(first50) ? first50 : []).findIndex((u) => u.id === me.id);
      if (idx < 0) return Response.json({ isEarly: false });
      return Response.json({ isEarly: true, userNumber: idx + 1 });
    }

    if (op === "checkUsername") {
      const username = String(body.username || "").trim().toLowerCase();
      if (username.length < 3) {
        return Response.json({ available: false, reason: "too_short" });
      }
      // Server-side rate limit — prevents username enumeration at scale
      const allowed = await checkProfileRate(ip, "checkUsername");
      if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });
      logProfileAttempt(ip, "checkUsername");
      // Direct filter — O(1) database lookup instead of loading all users.
      const users = await unrufld.asServiceRole.entities.User.filter({ username }, "-created_date", 1);
      const taken = (Array.isArray(users) ? users : []).length > 0;
      return Response.json({ available: !taken });
    }

    if (op === "resolveUsername") {
      const username = String(body.username || "").trim().toLowerCase();
      if (username.length < 3) return Response.json({ email: null });
      // Server-side rate limit — prevents email harvesting via username enumeration
      const allowed = await checkProfileRate(ip, "resolveUsername");
      if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });
      logProfileAttempt(ip, "resolveUsername");
      // Direct filter — O(1) database lookup instead of loading all users.
      const users = await unrufld.asServiceRole.entities.User.filter({ username }, "-created_date", 1);
      const match = (Array.isArray(users) ? users : [])[0];
      return Response.json({ email: match?.email || null });
    }

    if (op === "checkMustReset") {
      // Force-reset gate: check if a user must reset their password BEFORE
      // login. loginViaEmailPassword hard-redirects, so any post-login check
      // is dead code — the check must happen server-side here, before the
      // client calls loginViaEmailPassword.
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return Response.json({ mustReset: false });
      const allowed = await checkProfileRate(ip, "checkMustReset");
      if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });
      logProfileAttempt(ip, "checkMustReset");
      // Fast path: direct filter (works for lowercase emails)
      let users = await unrufld.asServiceRole.entities.User.filter({ email }, "-created_date", 1);
      let match = (Array.isArray(users) ? users : [])[0];
      // Fallback for mixed-case emails
      if (!match) {
        const all = await unrufld.asServiceRole.entities.User.list("-created_date", 1000);
        const list = Array.isArray(all) ? all : [];
        match = list.find((u) => String(u.email || "").toLowerCase() === email);
      }
      // Don't reveal whether an account exists
      if (!match) return Response.json({ mustReset: false });
      const CUTOFF = new Date("2026-08-09T20:30:00Z");
      const createdBeforeCutoff = !!(match.created_date && new Date(match.created_date) < CUTOFF);
      const flagged = match.must_reset_password === true;
      const notCleared = match.must_reset_password !== false;
      let mustReset = flagged || (createdBeforeCutoff && notCleared);
      // If the user just completed a password reset (client sets a localStorage
      // one-shot flag), clear the server flag so they're not forced to reset
      // again on the next login.
      if (mustReset && body.justReset === true) {
        try {
          await unrufld.asServiceRole.entities.User.update(match.id, { must_reset_password: false });
        } catch {}
        mustReset = false;
      }
      return Response.json({ mustReset });
    }

    if (op === "checkStatus") {
      const id = String(body.identifier || body.email || body.username || "").trim();
      if (!id) return Response.json({ status: "active" });
      // Server-side rate limit — prevents account status enumeration
      const allowed = await checkProfileRate(ip, "checkStatus");
      if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });
      logProfileAttempt(ip, "checkStatus");
      const isEmail = id.includes("@");
      const field = isEmail ? "email" : "username";
      const value = id.toLowerCase();
      // Fast path: direct filter (works for lowercase emails + normalized usernames)
      let users = await unrufld.asServiceRole.entities.User.filter({ [field]: value }, "-created_date", 1);
      let match = (Array.isArray(users) ? users : [])[0];
      // Fallback for mixed-case emails: list + case-insensitive comparison
      if (!match && isEmail) {
        const all = await unrufld.asServiceRole.entities.User.list("-created_date", 1000);
        const list = Array.isArray(all) ? all : [];
        match = list.find((u) => String(u.email || "").toLowerCase() === id.toLowerCase());
      }
      // Don't reveal whether an account exists — let the normal sign-in fail with
      // its own "invalid credentials" error. Only surface deleted/suspended.
      return Response.json({ status: match?.account_status || "active" });
    }

    if (op === "resolveReferrer") {
      // Look up a referral code and return the referrer's username so the
      // signup page can show "{username} has invited you to join teewai".
      const code = String(body.code || "").trim();
      if (!code) return Response.json({ valid: false });
      const accounts = await unrufld.asServiceRole.entities.ReferralAccount.filter({ referral_code: code });
      const account = (Array.isArray(accounts) ? accounts : [])[0];
      if (!account || !account.code_active) return Response.json({ valid: false });
      let username = "";
      try {
        const user = await unrufld.asServiceRole.entities.User.get(account.user_id);
        username = user?.username || user?.display_name || user?.first_name || "";
      } catch {}
      return Response.json({ valid: true, username });
    }

    return Response.json({ error: `Unknown op "${op}"` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}