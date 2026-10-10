// Sends user-facing email from the official teewai Gmail account (the connected
// `gmail` connector) so receipts, welcome messages and other user mail arrive
// as genuine Google mail from teewai's verified address — not a generic
// no-reply sender. Falls back to the platform SendEmail integration if the
// Gmail connector is not connected or the send fails, so mail never silently
// drops.
//
// Usage (backend function):
//   import { sendUserEmail } from '../../shared/gmailSend.ts';
//   await sendUserEmail(base44, to, subject, html, 'teewai');

function base64url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  // btoa is available in the Deno edge runtime.
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendUserEmail(base44: any, to: string, subject: string, html: string, fromName = 'teewai') {
  if (!to) return { sent: false, via: null };

  // 1) Official Gmail connector — sends from the connected teewai Gmail.
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    if (accessToken) {
      // Resolve the connected account's address so the From header is valid
      // and Gmail doesn't reject/rewrite the sender.
      let fromAddr = '';
      try {
        const pr = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (pr.ok) {
          const p = await pr.json();
          fromAddr = p.emailAddress || '';
        }
      } catch {}
      const fromHeader = fromAddr ? `${fromName} <${fromAddr}>` : fromName;
      const mime =
        `From: ${fromHeader}\r\n` +
        `To: ${to}\r\n` +
        `Subject: ${subject}\r\n` +
        `MIME-Version: 1.0\r\n` +
        `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
        html;
      const raw = base64url(mime);
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      if (res.ok) return { sent: true, via: 'gmail' };
    }
  } catch {}

  // 2) Fallback — platform SendEmail integration (still reaches the user).
  try {
    await base44.integrations.Core.SendEmail({ to, subject, body: html, from_name: fromName });
    return { sent: true, via: 'platform' };
  } catch {
    return { sent: false, via: null };
  }
}