import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { callInsforge, ensureTable } from "../../shared/insforgeRateLimit.ts";
import { getClientIp } from "../../shared/ipUtils.ts";

// Mirrors a login event into InsForge (`login_sessions` table). Called by the
// client right after a successful login (password / OTP / OAuth) so every
// login is recorded in InsForge alongside the Base44 auth session. Auth stays
// on Base44 (the platform owns tokens/sessions); this is a read-only mirror
// for audit + portability — it never grants access.

let ensured = false;
async function ensure() {
  if (ensured) return;
  ensured = true;
  await ensureTable("login_sessions", [
    { columnName: "userId", type: "string", isUnique: false, isNullable: false },
    { columnName: "email", type: "string", isUnique: false, isNullable: false },
    { columnName: "ipAddress", type: "string", isUnique: false, isNullable: false },
    { columnName: "userAgent", type: "string", isUnique: false, isNullable: true },
    { columnName: "loginAt", type: "string", isUnique: false, isNullable: false },
  ]);
}

export default async function (req: Request) {
  try {
    const unrufld = createClientFromRequest(req);
    const user = await unrufld.auth.me().catch(() => null);
    if (!user) return Response.json({ ok: false, skipped: "no-session" }, { status: 401 });
    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent") || "";
    await ensure();
    await callInsforge(`/api/database/records/login_sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        userId: user.id,
        email: user.email || "",
        ipAddress: ip || "unknown",
        userAgent: ua.slice(0, 300),
        loginAt: new Date().toISOString(),
      }]),
    });
    return Response.json({ ok: true });
  } catch (error) {
    // Never block a login because the mirror failed.
    return Response.json({ ok: false, error: (error as Error).message }, { status: 200 });
  }
}