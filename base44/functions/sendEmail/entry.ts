import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { welcomeEmailHtml, safeUrl } from '../../shared/emailTemplate.ts';

// Sends branded teewai emails to registered app users via the Core.SendEmail
// integration. Currently supports the welcome email fired right after signup.
// The email template lives in base44/shared/emailTemplate.ts so every email
// shares the same on-brand look (teal, Sora/Inter, logo).

export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);
    const user = await unrufld.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const appUrl = String(body.appUrl || '').trim();
    const safeAppUrl = safeUrl(appUrl);

    if (body.type === 'welcome') {
      const to = String(body.to || user.email || '').trim();
      if (!to) return Response.json({ error: 'Recipient email required' }, { status: 400 });
      const name = String(body.name || user.full_name || user.username || '').trim();
      const subject = 'Welcome to teewai — your smile journey starts now';
      const html = welcomeEmailHtml(name, safeAppUrl);
      await unrufld.integrations.Core.SendEmail({
        to,
        subject,
        body: html,
        from_name: 'teewai',
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: `Unknown email type "${body.type}"` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}