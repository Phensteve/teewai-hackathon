// teewai-branded nudge emails (deep teal shell, Sora headings, olo accents).
// Shared by the zeroScanReminder function.

const LOGO_URL =
  "https://media.base44.com/images/public/6a6611b97d7894c19d798137/b0f7ec0c0_ef637f6d-505d-4126-8c89-cd8b7ce218b9.png";

const H = "'Sora',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const B = "'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function shell(title: string, kicker: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#06181a;font-family:${B};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#06181a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#0a2226;border-radius:24px;overflow:hidden;border:1px solid rgba(0,217,192,0.18);">
        <tr><td style="background:linear-gradient(135deg,#06181a 0%,#0a2226 100%);padding:40px 40px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="teewai" width="56" height="56" style="display:block;margin:0 auto 16px;border-radius:14px;box-shadow:0 0 40px -8px rgba(0,217,192,0.55);">
          <h1 style="margin:0 0 8px;font-family:${H};font-weight:700;font-size:26px;color:#ffffff;letter-spacing:-0.5px;">${title}</h1>
          <p style="margin:0;font-family:${B};font-size:15px;color:#7fd9d0;">${kicker}</p>
        </td></tr>
        <tr><td style="padding:32px 40px 8px;">${inner}</td></tr>
        <tr><td style="padding:24px 40px 36px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 6px;font-family:${H};font-size:13px;color:#5fa39c;">Made with the rare <span style="color:#00d9c0;">olo</span> color.</p>
          <p style="margin:0 0 4px;font-family:${B};font-size:12px;color:#5a8f8a;">A product of unrufld corp · Designed by oluyo</p>
          <p style="margin:0;font-family:${B};font-size:11px;color:#3f6f6a;">teewai is a wellness companion, not a medical device — visit your dentist for professional care.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function cta(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
    <tr><td align="center" style="background-color:#00d9c0;border-radius:14px;">
      <a href="${href}" style="display:inline-block;padding:14px 34px;font-family:${H};font-weight:600;font-size:15px;color:#06181a;text-decoration:none;">${label}</a>
    </td></tr></table>`;
}

const p = (text: string, color = "#b8d4d1") =>
  `<p style="margin:0 0 16px;font-family:${B};font-size:15px;line-height:1.65;color:${color};">${text}</p>`;

// Nudge for users who signed up but never took a single scan.
export function zeroScanEmailHtml(name: string): string {
  const greeting = name && name !== "there" ? `Hi ${name},` : "Hi there,";
  const inner = `
  ${p(greeting, "#e6f7f5")}
  ${p("Your teeth are still waiting on you. 🦷 You joined teewai but haven't taken a single scan yet — which means we still have no idea how bright that smile of yours really is.")}
  ${p("One photo. Thirty seconds. That's the whole thing.")}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;">
    <tr><td style="padding:0 0 14px;font-family:${B};font-size:15px;line-height:1.5;color:#e6f7f5;"><span style="color:#00d9c0;font-weight:700;">1.</span>&nbsp; Your whiteness score, on the same VITA shade scale dentists use.</td></tr>
    <tr><td style="padding:0 0 14px;font-family:${B};font-size:15px;line-height:1.5;color:#e6f7f5;"><span style="color:#00d9c0;font-weight:700;">2.</span>&nbsp; A tooth-by-tooth read on stains, plaque and enamel wear.</td></tr>
    <tr><td style="padding:0 0 14px;font-family:${B};font-size:15px;line-height:1.5;color:#e6f7f5;"><span style="color:#00d9c0;font-weight:700;">3.</span>&nbsp; A whitening plan built for your smile — and your spot on the leaderboard.</td></tr>
  </table>
  ${p("Your <strong style=\"color:#00d9c0;\">5 free scans</strong> are still sitting in your account. No card needed.", "#b8d4d1")}
  ${cta("https://teewai.app/scan", "Scan my teeth")}
  <p style="margin:0;font-family:${B};font-size:14px;line-height:1.6;color:#7fd9d0;font-style:italic;">"A brighter smile isn't built in a day — it's built every day."</p>`;
  return shell("Your teeth need this", "You haven't taken your first scan yet.", inner);
}

// Warm, no-pressure nudge to pick up a scan pack.
export function packNudgeEmailHtml(name: string): string {
  const greeting = name && name !== "there" ? `Hey ${name},` : "Hey 👋";
  const inner = `
  ${p(greeting, "#e6f7f5")}
  ${p("Damilare here — the guy behind teewai. 😄 Just checking in on you.")}
  ${p("Whenever you're ready to keep scanning, the easiest move is grabbing a scan pack. Starter is <strong style=\"color:#00d9c0;\">$0.99 for 2 scans</strong>, Plus is <strong style=\"color:#00d9c0;\">$4.99 for 15</strong>, and Boost gives you <strong style=\"color:#00d9c0;\">30 scans for $9.99</strong> — one-time, no subscription, and scans never expire.")}
  ${p("Totally your call, and no rush at all. But if you pick one up, you'd genuinely be helping teewai grow — and I'd appreciate it a lot. 🙂")}
  ${cta("https://teewai.app/subscription", "Browse scan packs")}
  ${p("Any questions, just reply to this email — it comes straight to me.", "#7fd9d0")}
  <p style="margin:18px 0 0;font-family:${B};font-size:14px;line-height:1.6;color:#e6f7f5;">Warmly,<br><strong style="font-family:${H};">Damilare Oluyo</strong><br><span style="color:#5fa39c;">Founder, teewai</span></p>`;
  return shell("A little nudge from teewai", "Scan packs, whenever you're ready.", inner);
}