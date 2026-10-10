// Branded teewai email templates. Inline-styled HTML for maximum email-client
// compatibility. Palette mirrors src/index.css design tokens:
//   primary (olo)   = #00B8A5  (hsl(174 100% 36%))
//   deep  (olo-deep) = #06494C  (hsl(182 85% 16%))
// Fonts: Sora (headings) + Inter (body), with safe system fallbacks.

// Escape user-supplied text before interpolating into HTML to prevent
// markup injection (CWE-80). Covers &, <, >, ", and '.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Only allow http/https URLs — rejects javascript:, data:, and other
// dangerous schemes that could be used for phishing via injected links.
export function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "#";
}

const LOGO_URL =
  "https://media.base44.com/images/public/6a6611b97d7894c19d798137/b0f7ec0c0_ef637f6d-505d-4126-8c89-cd8b7ce218b9.png";

const FONT_FAMILY_HEADING =
  "'Sora', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FONT_FAMILY_BODY =
  "'Inter', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Shared outer shell — deep teal gradient backdrop with a floating card.
function shell(innerHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>teewai</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#041a18;font-family:${FONT_FAMILY_BODY};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#052b28 0%,#041a18 100%);min-height:100%;">
    <tr><td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.08);">
        <tr><td style="background:#06302d;padding:28px 32px;text-align:center;">
          <img src="${LOGO_URL}" width="48" height="48" alt="teewai" style="border-radius:12px;display:inline-block;margin:0 auto;" />
          <p style="margin:10px 0 0;font-family:${FONT_FAMILY_HEADING};font-weight:700;letter-spacing:-0.01em;font-size:20px;color:#e6fbf6;">teewai</p>
        </td></tr>
        <tr><td style="padding:40px 40px 8px;">
          ${innerHtml}
        </td></tr>
        <tr><td style="padding:8px 40px 36px;">
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#7a9a94;text-align:center;">teewai · a wellness companion, not a medical device.<br/>Please visit your dentist for professional dental care.</p>
          <p style="margin:12px 0 0;font-size:11px;color:#5b7773;text-align:center;">© teewai. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;text-decoration:none;background:#00b8a5;color:#ffffff;font-family:${FONT_FAMILY_HEADING};font-weight:700;font-size:15px;letter-spacing:0.01em;padding:15px 34px;border-radius:14px;box-shadow:0 8px 24px rgba(0,184,165,0.35);">${label}</a>`;
}

export function welcomeEmailHtml(name: string, appUrl: string): string {
  const greetName = (name && name.trim()) ? escapeHtml(name.trim()) : "there";
  const dash = appUrl ? `${safeUrl(appUrl).replace(/\/$/, "")}/dashboard` : "#";
  const body = `
  <h1 style="margin:0 0 8px;font-family:${FONT_FAMILY_HEADING};font-weight:800;letter-spacing:-0.02em;font-size:28px;line-height:1.15;color:#0a1f1d;">Welcome to teewai,<br/>${greetName} 👋</h1>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#3d5551;">Your smile journey starts now. Snap a photo, let our AI score your whiteness &amp; dental health, and track every shade brighter — week after week.</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e6fbf6;border-radius:18px;margin:0 0 24px;">
    <tr><td style="padding:22px 24px;">
      <p style="margin:0 0 10px;font-family:${FONT_FAMILY_HEADING};font-weight:700;font-size:15px;color:#06494c;">Your first 3 steps</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;font-size:14px;color:#0a1f1d;"><span style="color:#00b8a5;font-weight:700;">1.</span>&nbsp;&nbsp;Snap your first scan — front-facing, good light.</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#0a1f1d;"><span style="color:#00b8a5;font-weight:700;">2.</span>&nbsp;&nbsp;See your whiteness score, shade &amp; dental health.</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#0a1f1d;"><span style="color:#00b8a5;font-weight:700;">3.</span>&nbsp;&nbsp;Follow your plan and watch your smile climb.</td></tr>
      </table>
    </td></tr>
  </table>

  <p style="margin:0 0 26px;font-size:14px;line-height:1.6;color:#3d5551;">You start with <strong style="color:#06494c;">5 free scans</strong> — no card needed. Want unlimited? Go Pro anytime.</p>

  <div style="text-align:center;">${ctaButton(dash, "Open teewai →")}</div>

  <p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#5b7773;">If the button doesn't work, copy this link into your browser:<br/><a href="${dash}" style="color:#00b8a5;text-decoration:none;">${dash}</a></p>
  `;
  return shell(body);
}

export function streakEmailHtml(name: string, daysSince: number, appUrl: string): string {
  const greetName = (name && name.trim()) ? escapeHtml(name.trim()) : "there";
  const scan = appUrl ? `${safeUrl(appUrl).replace(/\/$/, "")}/scan` : "https://teewai.app/scan";
  const isOneDay = daysSince === 1;
  const body = `
  <h1 style="margin:0 0 8px;font-family:${FONT_FAMILY_HEADING};font-weight:800;letter-spacing:-0.02em;font-size:28px;line-height:1.15;color:#0a1f1d;">Don't lose your streak, ${greetName} 🔥</h1>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#3d5551;">Your smile streak needs you. It's been <strong style="color:#06494c;">${daysSince} day${isOneDay ? "" : "s"}</strong> since your last teewai scan.</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e6fbf6;border-radius:18px;margin:0 0 24px;">
    <tr><td style="padding:22px 24px;">
      <p style="margin:0 0 10px;font-family:${FONT_FAMILY_HEADING};font-weight:700;font-size:15px;color:#06494c;">Why a quick scan matters</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;font-size:14px;color:#0a1f1d;">✓&nbsp;&nbsp;Keep your streak alive and your Smile MMR climbing</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#0a1f1d;">✓&nbsp;&nbsp;Stay on track with your personalized whitening plan</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#0a1f1d;">✓&nbsp;&nbsp;Streak-shields only last so long — don't let progress decay</td></tr>
      </table>
    </td></tr>
  </table>

  <p style="margin:0 0 26px;font-size:14px;line-height:1.6;color:#3d5551;">A quick 30-second scan is all it takes. Open teewai and snap today's photo.</p>

  <div style="text-align:center;">${ctaButton(scan, "Scan now →")}</div>

  <p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#5b7773;">If the button doesn't work, copy this link:<br/><a href="${scan}" style="color:#00b8a5;text-decoration:none;">${scan}</a></p>
  `;
  return shell(body);
}

// Order-confirmation receipt — clean, light, card-based layout (Spotify-style):
// logo header, "Thanks for your order!", a bordered details box, a solid
// "View order" button, and a footer with the recipient address + contact links.
// Deliberately NOT using the dark shell — this mirrors official order emails.
export function receiptEmailHtml(name: string, email: string, planLabel: string, amountUsd: number | null, reference: string, dateIso: string, appUrl: string): string {
  const greetName = (name && name.trim()) ? escapeHtml(name.trim()) : "there";
  const dash = appUrl ? `${safeUrl(appUrl).replace(/\/$/, "")}/dashboard` : "https://teewai.app/dashboard";
  const helpUrl = appUrl ? `${safeUrl(appUrl).replace(/\/$/, "")}/help` : "https://teewai.app/help";
  const termsUrl = appUrl ? `${safeUrl(appUrl).replace(/\/$/, "")}/terms` : "https://teewai.app/terms";
  const supportUrl = appUrl ? `${safeUrl(appUrl).replace(/\/$/, "")}/support` : "https://teewai.app/support";
  const amt = amountUsd != null ? `$${Number(amountUsd).toFixed(2)}` : "—";
  let dateStr = "";
  try {
    dateStr = new Date(dateIso || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch { dateStr = new Date().toLocaleDateString(); }
  const safeEmail = escapeHtml(email || "");
  const safeRef = escapeHtml(reference || "");
  const safePlan = escapeHtml(planLabel || "");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Your teewai order</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:${FONT_FAMILY_BODY};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;">
    <tr><td align="center" style="padding:28px 16px 40px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ececec;box-shadow:0 2px 12px rgba(0,0,0,0.04);">

        <!-- Header: logo + wordmark -->
        <tr><td style="padding:26px 32px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;"><img src="${LOGO_URL}" width="34" height="34" alt="teewai" style="border-radius:9px;display:block;" /></td>
            <td style="vertical-align:middle;padding-left:10px;"><span style="font-family:${FONT_FAMILY_HEADING};font-weight:700;font-size:18px;color:#0a1f1d;letter-spacing:-0.01em;">teewai</span></td>
          </tr></table>
        </td></tr>

        <!-- Heading + subtext -->
        <tr><td style="padding:6px 32px 0;">
          <h1 style="margin:0 0 8px;font-family:${FONT_FAMILY_HEADING};font-weight:800;letter-spacing:-0.02em;font-size:26px;line-height:1.2;color:#1a1a1a;">Thanks for your order!</h1>
          <p style="margin:0 0 4px;font-size:15px;line-height:1.55;color:#888888;">Hi ${greetName}, here's your receipt for this purchase.</p>
        </td></tr>

        <!-- Status -->
        <tr><td style="padding:18px 32px 0;">
          <p style="margin:0;font-family:${FONT_FAMILY_HEADING};font-weight:700;font-size:18px;color:#1a1a1a;">Order placed</p>
        </td></tr>

        <!-- Details box -->
        <tr><td style="padding:14px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ececec;border-radius:14px;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:13px;color:#888888;">Item(s)</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;">${safePlan}</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:13px;color:#888888;">Date</td>
                <td align="right" style="font-size:14px;color:#333333;">${escapeHtml(dateStr)}</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:13px;color:#888888;">Amount paid</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;">${amt}</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:13px;color:#888888;">Invoice ID</td>
                <td align="right" style="font-size:13px;color:#333333;font-family:monospace;word-break:break-all;">${safeRef}</td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

        <!-- View order button -->
        <tr><td style="padding:24px 32px 8px;text-align:center;">
          <a href="${dash}" style="display:inline-block;text-decoration:none;background:#06494c;color:#ffffff;font-family:${FONT_FAMILY_HEADING};font-weight:700;font-size:15px;letter-spacing:0.01em;padding:15px 40px;border-radius:12px;">View order</a>
        </td></tr>
        <tr><td style="padding:10px 32px 0;text-align:center;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#888888;">If the button doesn't work, copy this link:<br/><a href="${dash}" style="color:#00b8a5;text-decoration:none;">${dash}</a></p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:28px 32px 32px;border-top:1px solid #ececec;">
          <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#6c757d;">This message was sent to <a href="mailto:${safeEmail}" style="color:#0056b3;text-decoration:none;">${safeEmail}</a>. If you have questions, please <a href="${supportUrl}" style="color:#0056b3;text-decoration:none;">contact us</a>.</p>
          <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#6c757d;"><a href="${termsUrl}" style="color:#0056b3;text-decoration:none;">Terms of Use</a> &nbsp;|&nbsp; <a href="${helpUrl}" style="color:#0056b3;text-decoration:none;">Help Center</a> &nbsp;|&nbsp; <a href="${supportUrl}" style="color:#0056b3;text-decoration:none;">Contact Us</a></p>
          <p style="margin:0 0 4px;font-size:11px;line-height:1.6;color:#6c757d;">unrufld corp · Designed by oluyo</p>
          <p style="margin:0;font-size:11px;line-height:1.6;color:#9aa3ab;">teewai is a wellness companion, not a medical device — visit your dentist for professional care.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Verification decision email — sent to a user when an admin approves or
// declines their medical verification, blog post, or blogger application.
// Uses the branded dark shell (consistent with welcome / streak emails).
export function verificationDecisionHtml(name: string, kindLabel: string, status: string, notes: string, appUrl: string): string {
  const greetName = (name && name.trim()) ? escapeHtml(name.trim()) : "there";
  const profile = appUrl ? `${safeUrl(appUrl).replace(/\/$/, "")}/profile` : "https://teewai.app/profile";
  const approved = status === "approved";
  const heading = approved ? "You're verified" : "Update on your application";
  const lead = approved
    ? `Great news, ${greetName}. Your ${escapeHtml(kindLabel)} has been approved.`
    : `Hi ${greetName}, your ${escapeHtml(kindLabel)} wasn't approved this time.`;
  const statusNote = approved
    ? "Your verified badge is now live on your profile and community posts."
    : "You can re-apply anytime from your profile — we're happy to take another look.";
  const notesBlock = notes && notes.trim()
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e6fbf6;border-radius:14px;margin:18px 0 22px;"><tr><td style="padding:16px 20px;"><p style="margin:0;font-size:13px;color:#06494c;"><strong>Notes from our team:</strong><br/>${escapeHtml(notes.trim())}</p></td></tr></table>`
    : "";
  const body = `
  <h1 style="margin:0 0 8px;font-family:${FONT_FAMILY_HEADING};font-weight:800;letter-spacing:-0.02em;font-size:28px;line-height:1.15;color:#0a1f1d;">${heading}</h1>
  <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#3d5551;">${lead}</p>
  <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#3d5551;">${statusNote}</p>
  ${notesBlock}
  <div style="text-align:center;">${ctaButton(profile, "Open teewai →")}</div>
  <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#5b7773;">If the button doesn't work, copy this link:<br/><a href="${profile}" style="color:#00b8a5;text-decoration:none;">${profile}</a></p>
  `;
  return shell(body);
}