import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { receiptEmailHtml } from '../../shared/emailTemplate.ts';
import { sendUserEmail } from '../../shared/gmailSend.ts';

import { PLAN_PRICES, SCAN_PRICE, PLAN_LABELS, SCANS_FOR_PLAN, UNLIMITED_PLANS, FIRST50_BONUS, subEntity, isEarlyAdopter, activateSubscription, validateCoupon, recordCouponUse } from '../../shared/subscriptionActivation.ts';

// Paystack (NG merchant) settles in NGN. Adjust this rate to your settlement rate.
const USD_TO_NGN = 1500;
const CURRENCY = 'NGN';

export default async function(req) {
  try {
    const unrufld = createClientFromRequest(req);
    const user = await unrufld.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const secret = secrets.get('PAYSTACK_SECRET_KEY');
    if (!secret) return Response.json({ error: 'Paystack secret not configured' }, { status: 500 });

    if (action === 'initialize') {
      // The frontend uses a LIVE public key (pk_live_...). A TEST secret key
      // (sk_test_...) produces a test access_code that the live popup cannot
      // load — which surfaces as a cryptic "Please enter a valid email address"
      // error. Detect the mismatch and return a clear, actionable message.
      if (secret && secret.startsWith('sk_test_')) {
        return Response.json({
          error: 'Paystack key mismatch: your secret key is a TEST key (sk_test_...) but the app uses a LIVE public key. Set a LIVE secret key (sk_live_...) from the same Paystack account in your app secrets.',
        }, { status: 500 });
      }
      const plan = body.plan;
      let usd;
      let scans = null;
      if (plan === 'custom') {
        scans = Math.max(1, Math.min(500, Math.floor(Number(body.scans) || 1)));
        usd = +(scans * SCAN_PRICE).toFixed(2);
      } else {
        usd = PLAN_PRICES[plan];
        if (!usd) return Response.json({ error: 'Invalid plan' }, { status: 400 });
      }

      // Optional coupon: validate server-side and discount the charge.
      const { finalUsd, couponCode } = await validateCoupon(body.coupon, usd);

      const amount = Math.round(finalUsd * USD_TO_NGN * 100); // NGN kobo
      const email = String(user.email || body.email || '').trim();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return Response.json({ error: 'A valid email is required to start payment' }, { status: 400 });
      }

      const reference = 'teewai_' + plan + (plan === 'custom' ? `_${scans}` : '') + '_' + Date.now();
      const scansForMeta = scans || (plan === 'pack_2' ? 4 : plan === 'pack_15' ? 30 : plan === 'pack_30' ? 60 : plan === 'pack_daily' ? 1 : plan === 'family_15' ? 150 : 0);
      const metadata = {
        plan,
        scans: scansForMeta,
        coupon: couponCode,
        user_id: user.id,
        custom_fields: [
          { display_name: 'Plan', variable_name: 'plan', value: plan },
          { display_name: 'Scans', variable_name: 'scans', value: String(scansForMeta) },
          ...(couponCode ? [{ display_name: 'Coupon', variable_name: 'coupon', value: couponCode }] : []),
        ],
      };

      // Native APK flow: initialize the transaction with Paystack's API so the
      // checkout page opens with a valid access_code. Without this, opening
      // https://checkout.paystack.com/{reference} fails because Paystack doesn't
      // recognize a custom reference — it needs an access_code from the
      // initialize API. The callback_url tells Paystack where to redirect after
      // payment (the web app, which verifies; the APK polls on focus regain).
      if (body.callback_url) {
        const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + secret,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email, amount, currency: CURRENCY, reference, metadata,
            callback_url: body.callback_url,
            channels: ['card', 'bank_transfer', 'ussd', 'bank', 'qr', 'mobile_money'],
          }),
        });
        const psData = await psRes.json();
        if (!psData.status) {
          return Response.json({ error: psData.message || 'Paystack initialization failed' }, { status: 400 });
        }
        return Response.json({
          reference, amount, currency: CURRENCY, email, metadata,
          access_code: psData.data.access_code,
          authorization_url: psData.data.authorization_url,
        });
      }

      // Client-side inline flow: the popup creates the transaction using the
      // public key + these values. The amount is computed server-side (with
      // coupon) so it stays authoritative; verification happens by reference.
      return Response.json({ reference, amount, currency: CURRENCY, email, metadata });
    }

    if (action === 'verify') {
      const reference = body.reference;
      if (!reference) return Response.json({ error: 'Reference required' }, { status: 400 });

      const res = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
        headers: { Authorization: 'Bearer ' + secret },
      });
      const data = await res.json();
      if (!data.status) return Response.json({ error: data.message || 'Verification failed' }, { status: 400 });

      const paid = data.data.status === 'success';
      // CRITICAL: Verify the payment was made by the authenticated user.
      // Without this, a user could intercept another user's payment reference
      // and call verify from their own account to credit the plan to themselves
      // (the idempotency check is per-user, so both users would get credited
      // from a single payment).
      if (paid) {
        const payerEmail = String(data.data.customer?.email || '').toLowerCase().trim();
        const myEmail = String(user.email || '').toLowerCase().trim();
        if (payerEmail && myEmail && payerEmail !== myEmail) {
          return Response.json({ error: 'This payment belongs to a different account.' }, { status: 403 });
        }
      }
      const meta = (data.data.metadata && typeof data.data.metadata === 'object') ? data.data.metadata : {};
      // The inline popup reliably stores custom_fields; top-level keys may or may
      // not survive. Fall back to custom_fields so activation always resolves.
      const cf = Array.isArray(meta.custom_fields) ? meta.custom_fields : [];
      const cfVal = (name) => {
        const f = cf.find((x) => x && x.variable_name === name);
        return f && f.value != null ? f.value : undefined;
      };
      const plan = meta.plan || cfVal('plan');
      const scansRaw = meta.scans != null ? meta.scans : cfVal('scans');
      const scans = scansRaw != null && scansRaw !== '' ? Number(scansRaw) : undefined;
      const coupon = meta.coupon || cfVal('coupon');
      if (paid && coupon) { try { await recordCouponUse(coupon); } catch {} }
      // Activate the purchased plan/credits server-side so plan + scans_limit
      // persist (the user-facing proxy strips those fields). Pass the ACTUAL
      // amount paid (converted from NGN kobo → USD) so the purchase record
      // stores the discounted amount — the admin "after coupons" revenue view
      // then reflects real collections, not the list price.
      let activation = { bonus: 0, subscription: null };
      if (paid) {
        const paidUsd = data.data && data.data.amount ? +(data.data.amount / 100 / USD_TO_NGN).toFixed(2) : null;
        // CRITICAL: Verify the paid amount matches the plan's expected price.
        // The payment metadata is client-controlled (passed through Paystack's
        // popup), so a malicious client could change the plan in the metadata
        // while paying a cheaper price — e.g. pay $0.99 (pack_2) but set
        // metadata plan=pro to get unlimited scans. This check prevents that.
        let expectedUsd = null;
        if (plan === 'custom' && scans != null) {
          expectedUsd = +(scans * SCAN_PRICE).toFixed(2);
        } else if (PLAN_PRICES[plan] != null) {
          expectedUsd = PLAN_PRICES[plan];
        }
        // If a coupon was applied, re-validate and compute the discounted price.
        if (coupon && expectedUsd != null) {
          const { finalUsd } = await validateCoupon(coupon, expectedUsd);
          expectedUsd = finalUsd;
        }
        if (expectedUsd != null && paidUsd != null && expectedUsd > 0 && paidUsd < expectedUsd * 0.95) {
          return Response.json({ error: 'Payment amount does not match the selected plan. Please contact support.' }, { status: 400 });
        }
        try { activation = await activateSubscription(user, plan, scans, reference, paidUsd); }
        catch (e) {
          // Don't silently swallow — a swallowed activation error leaves the
          // user charged but uncredited, and the admin paid-user count never
          // updates. Surface it so the user knows to contact support.
          return Response.json({ error: "Payment received but we couldn't credit your account. Please contact support with reference " + reference }, { status: 500 });
        }
        // Email a receipt to the buyer for every successful purchase.
        try {
          const planLabel = PLAN_LABELS[plan] || (plan === 'custom' ? 'Custom Scan Pack' : plan);
          await sendUserEmail(
            unrufld,
            user.email,
            'Your teewai order confirmation',
            receiptEmailHtml(
              user.display_name || user.full_name || user.username || '',
              user.email,
              planLabel,
              paidUsd,
              data.data.reference,
              data.data.paid_at || new Date().toISOString(),
              'https://teewai.app',
            ),
            'teewai',
          );
        } catch {}
      }
      return Response.json({
        paid,
        reference: data.data.reference,
        amount: data.data.amount,
        currency: data.data.currency,
        plan,
        scans,
        bonus: activation.bonus,
        subscription: activation.subscription,
      });
    }

    if (action === 'syncPurchases') {
      // Reconcile the user's REAL Paystack history: list successful teewai_
      // transactions for this email and return them so the app can record any
      // purchases that verify missed (e.g. metadata that didn't survive the
      // inline popup). Keyed by email so it works for Google and email logins.
      const email = String(user.email || '').toLowerCase().trim();
      if (!email) return Response.json({ transactions: [] });
      const res = await fetch('https://api.paystack.co/transaction?perPage=50', {
        headers: { Authorization: 'Bearer ' + secret },
      });
      const data = await res.json();
      if (!data.status) return Response.json({ transactions: [], error: data.message });
      const txns = (data.data || [])
        .filter((t) =>
          t.status === 'success' &&
          (t.reference || '').startsWith('teewai_') &&
          (t.customer?.email || '').toLowerCase() === email
        )
        .map((t) => {
          const meta = (t.metadata && typeof t.metadata === 'object') ? t.metadata : {};
          const cf = Array.isArray(meta.custom_fields) ? meta.custom_fields : [];
          const cfVal = (name) => {
            const f = cf.find((x) => x && x.variable_name === name);
            return f && f.value != null ? f.value : undefined;
          };
          const plan = meta.plan || cfVal('plan');
          const scansRaw = meta.scans != null ? meta.scans : cfVal('scans');
          const scans = scansRaw != null && scansRaw !== '' ? Number(scansRaw) : (plan === 'pack_2' ? 4 : plan === 'pack_15' ? 30 : plan === 'pack_30' ? 60 : plan === 'pack_daily' ? 1 : plan === 'family_15' ? 150 : 0);
          return {
            reference: t.reference,
            amount: t.amount,
            currency: t.currency,
            plan,
            scans,
            date: t.created_at || t.paid_at || new Date().toISOString(),
          };
        });
      return Response.json({ transactions: txns });
    }

    if (action === 'freeActivate') {
      // A 100% (or excess fixed-amount) coupon brings the total to ₦0, which
      // Paystack can't initialize. Validate the coupon server-side, confirm the
      // order is genuinely free, activate the plan directly, and log coupon use.
      const plan = body.plan;
      let usd;
      let scans = null;
      if (plan === 'custom') {
        scans = Math.max(1, Math.min(500, Math.floor(Number(body.scans) || 1)));
        usd = +(scans * SCAN_PRICE).toFixed(2);
      } else {
        usd = PLAN_PRICES[plan];
        if (!usd) return Response.json({ error: 'Invalid plan' }, { status: 400 });
      }

      const { finalUsd, couponCode } = await validateCoupon(body.coupon, usd);
      if (finalUsd > 0) return Response.json({ error: 'Coupon does not cover the full amount — pay normally.' }, { status: 400 });

      const reference = 'teewai_free_' + plan + (plan === 'custom' ? `_${scans}` : '') + '_' + Date.now();
      const scansForMeta = scans || (plan === 'pack_2' ? 4 : plan === 'pack_15' ? 30 : plan === 'pack_30' ? 60 : plan === 'pack_daily' ? 1 : plan === 'family_15' ? 150 : 0);

      if (couponCode) { try { await recordCouponUse(couponCode); } catch {} }

      let activation = { bonus: 0, subscription: null };
      try { activation = await activateSubscription(user, plan, scans, reference, 0); } catch {}
      return Response.json({ ok: true, plan, scans: scansForMeta, reference, subscription: activation.subscription, bonus: activation.bonus });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}