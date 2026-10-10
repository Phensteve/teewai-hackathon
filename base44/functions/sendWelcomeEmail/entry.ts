import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Branded welcome email, sent from the connected Gmail account (shared connector)
// when a new user registers. Triggered by the WelcomeEmail workflow on User create.
// Design matches teewai: Sora headings, Inter body, the rare olo (#00d9c0) on deep teal.

const LOGO_URL = "https://media.base44.com/images/public/6a6611b97d7894c19d798137/b0f7ec0c0_ef637f6d-505d-4126-8c89-cd8b7ce218b9.png";

function base64url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function welcomeHtml(name) {
  const greeting = name && name !== "there" ? `Hi ${escapeHtml(name)},` : "Hi there,";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#06181a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#06181a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#0a2226;border-radius:24px;overflow:hidden;border:1px solid rgba(0,217,192,0.18);">
        <tr><td style="background:linear-gradient(135deg,#06181a 0%,#0a2226 100%);padding:40px 40px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="teewai" width="56" height="56" style="display:block;margin:0 auto 16px;border-radius:14px;box-shadow:0 0 40px -8px rgba(0,217,192,0.55);">
          <h1 style="margin:0 0 8px;font-family:'Sora',-apple-system,sans-serif;font-weight:700;font-size:26px;color:#ffffff;letter-spacing:-0.5px;">Welcome to teewai</h1>
          <p style="margin:0;font-family:'Inter',sans-serif;font-size:15px;color:#7fd9d0;">Your AI-powered smile journey starts now.</p>
        </td></tr>
        <tr><td style="padding:32px 40px 8px;">
          <p style="margin:0 0 16px;font-family:'Inter',sans-serif;font-size:16px;line-height:1.65;color:#e6f7f5;">${greeting}</p>
          <p style="margin:0 0 16px;font-family:'Inter',sans-serif;font-size:15px;line-height:1.65;color:#b8d4d1;">teewai turns your phone camera into a dental vision lab. Snap a quick photo of your teeth and our AI scores your whiteness against the VITA shade guide, screens your gums and enamel with research-backed clinical indices, and builds a personalized whitening plan that gets smarter with every scan.</p>
          <p style="margin:0 0 24px;font-family:'Inter',sans-serif;font-size:15px;line-height:1.65;color:#b8d4d1;">Your first two scans are on us — no card needed. Here's how to get the most out of teewai:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="padding:0 0 14px 0;font-family:'Inter',sans-serif;font-size:15px;line-height:1.5;color:#e6f7f5;"><span style="color:#00d9c0;font-weight:700;">1.</span>&nbsp; Find good, natural light and face the camera directly.</td></tr>
            <tr><td style="padding:0 0 14px 0;font-family:'Inter',sans-serif;font-size:15px;line-height:1.5;color:#e6f7f5;"><span style="color:#00d9c0;font-weight:700;">2.</span>&nbsp; Hold a white index card beside your teeth for color calibration.</td></tr>
            <tr><td style="padding:0 0 14px 0;font-family:'Inter',sans-serif;font-size:15px;line-height:1.5;color:#e6f7f5;"><span style="color:#00d9c0;font-weight:700;">3.</span>&nbsp; Scan daily to keep your streak alive and climb the Smile MMR ladder.</td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td align="center" style="background-color:#00d9c0;border-radius:14px;">
              <a href="https://teewai.app/dashboard" style="display:inline-block;padding:14px 34px;font-family:'Sora',sans-serif;font-weight:600;font-size:15px;color:#06181a;text-decoration:none;">Open my dashboard</a>
            </td></tr>
          </table>
          <p style="margin:0;font-family:'Inter',sans-serif;font-size:14px;line-height:1.6;color:#7fd9d0;font-style:italic;">"A brighter smile isn't built in a day — it's built every day."</p>
        </td></tr>
        <tr><td style="padding:24px 40px 36px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 6px;font-family:'Sora',sans-serif;font-size:13px;color:#5fa39c;">Made with the rare <span style="color:#00d9c0;">olo</span> color.</p>
          <p style="margin:0 0 4px;font-family:'Inter',sans-serif;font-size:12px;color:#5a8f8a;">A product of unrufld corp · Designed by oluyo</p>
          <p style="margin:0;font-family:'Inter',sans-serif;font-size:11px;color:#3f6f6a;">You received this email because you joined teewai. teewai is a wellness companion, not a medical device — visit your dentist for professional care.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Authenticated callers only, and the welcome email can only ever be sent
    // to the caller's own verified account address — never an arbitrary one.
    // This stops the endpoint being used as an open mail relay.
    let me = null;
    try { me = await unrufld.auth.me(); } catch { me = null; }
    if (!me?.email) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const email = me.email;

    const rawName = String(body.name || "").trim() || email.split("@")[0];
    // Header-injection guard + sane length cap on the display name.
    const safeName = rawName.replace(/[\r\n<>]/g, "").slice(0, 60);
    const name = safeName && safeName !== "null" ? safeName : "there";

    const { accessToken } = await unrufld.asServiceRole.connectors.getConnection("gmail");

    const subject = "Welcome to teewai - your smile journey starts now";
    const html = welcomeHtml(name);

    const rawMessage = [
      `From: teewai <notifications@teewai.app>`,
      `To: ${name !== "there" ? `${name} ` : ""}<${email}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      html,
    ].join("\r\n");

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: base64url(rawMessage) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return Response.json({ error: data?.error?.message || "gmail send failed" }, { status: 500 });
    return Response.json({ ok: true, id: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}