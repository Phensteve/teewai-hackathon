import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ensureTable, countRecords, insertRecords, deleteRecords } from '../../shared/insforgeRateLimit.ts';
import { getClientIp } from '../../shared/ipUtils.ts';

// Public endpoint: submits user complaints/suggestions and forwards them
// to help-desk@teewai.app via the authorized Gmail connector.
// No user auth required — anyone can submit feedback.

const HELP_DESK_EMAIL = 'help-desk@teewai.app';
const PHONE = '+2349067100255';

function base64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Strip CR/LF to prevent MIME header injection (CRLF in name/email/subject
// could inject arbitrary headers into the raw email message).
function stripCrlf(text) {
  return String(text || '').replace(/[\r\n]/g, '');
}

const FEEDBACK_TABLE = 'feedback_attempts';
let feedbackTableEnsured = false;
const FEEDBACK_RATE_MAX = 3;
const FEEDBACK_RATE_WINDOW_MS = 60 * 60 * 1000; // 3 per hour per IP

async function ensureFeedbackTable() {
  if (feedbackTableEnsured) return;
  feedbackTableEnsured = true;
  await ensureTable(FEEDBACK_TABLE, [
    { columnName: 'ip_address', type: 'string', isUnique: false, isNullable: false },
    { columnName: 'attempted_at', type: 'string', isUnique: false, isNullable: false },
  ]);
}

export default async function(req) {
  try {
    // Rate limit: 3 feedback submissions per hour per IP to prevent spam
    // through the Gmail connector (which costs money per send).
    const ip = getClientIp(req);
    if (ip && ip !== 'unknown') {
      await ensureFeedbackTable();
      const cutoff = new Date(Date.now() - FEEDBACK_RATE_WINDOW_MS).toISOString();
      const cleanupCutoff = new Date(Date.now() - FEEDBACK_RATE_WINDOW_MS * 2).toISOString();
      deleteRecords(FEEDBACK_TABLE, { attempted_at: { lt: cleanupCutoff } });
      const count = await countRecords(FEEDBACK_TABLE, { ip_address: ip, attempted_at: { gte: cutoff } });
      if (count >= FEEDBACK_RATE_MAX) {
        return Response.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
      }
      await insertRecords(FEEDBACK_TABLE, [{ ip_address: ip, attempted_at: new Date().toISOString() }]);
    }

    const unrufld = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const name = stripCrlf(String(body.name || '').trim());
    const email = stripCrlf(String(body.email || '').trim());
    const type = stripCrlf(String(body.type || '').trim());
    const subject = stripCrlf(String(body.subject || '').trim());
    const message = String(body.message || '').trim();

    // Validate required fields
    if (!name || !email || !type || !message) {
      return Response.json({ error: 'Name, email, type, and message are required.' }, { status: 400 });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Get Gmail connection (shared connector, already authorized)
    const { accessToken } = await unrufld.asServiceRole.connectors.getConnection('gmail');

    if (!accessToken) {
      return Response.json({ error: 'Email service not configured.' }, { status: 500 });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeType = escapeHtml(type);
    const safeSubject = escapeHtml(subject || '(no subject)');
    const safeMessage = escapeHtml(message);

    // Construct MIME message
    const mimeMessage = [
      `From: teewai Feedback <noreply@teewai.app>`,
      `To: ${HELP_DESK_EMAIL}`,
      `Reply-To: ${name} <${email}>`,
      `Subject: [${type}] ${subject || 'New feedback'}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      ``,
      `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafb;">`,
      `  <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">`,
      `    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">`,
      `      <span style="font-size: 20px; font-weight: 700; color: #0d9f8e;">teewai</span>`,
      `      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">Feedback Center</span>`,
      `    </div>`,
      `    <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 18px;">New ${safeType}</h2>`,
      `    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`,
      `      <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 80px;">Name:</td><td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 500;">${safeName}</td></tr>`,
      `      <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Email:</td><td style="padding: 6px 0; color: #0d9f8e; font-size: 14px;">${safeEmail}</td></tr>`,
      `      <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Type:</td><td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${safeType}</td></tr>`,
      `      <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Subject:</td><td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${safeSubject}</td></tr>`,
      `    </table>`,
      `    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">`,
      `      <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Message</p>`,
      `      <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>`,
      `    </div>`,
      `    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">`,
      `      <p style="margin: 0;">Reply directly to this email to respond to ${safeName}.</p>`,
      `      <p style="margin: 4px 0 0;">Or call our help desk: ${PHONE}</p>`,
      `    </div>`,
      `  </div>`,
      `</div>`,
    ].join('\r\n');

    const encodedMessage = base64urlEncode(mimeMessage);

    // Send via Gmail API
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text();
      return Response.json({ error: `Failed to send email: ${errorText}` }, { status: 500 });
    }

    const result = await gmailResponse.json();

    return Response.json({ ok: true, messageId: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}