import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { PLAN_PRICES, SCAN_PRICE, PLAN_LABELS, validateCoupon, recordCouponUse, activateSubscription } from '../../shared/subscriptionActivation.ts';
import { receiptEmailHtml } from '../../shared/emailTemplate.ts';
import { sendUserEmail } from '../../shared/gmailSend.ts';

// Bachs.io — hosted checkout for non-Nigerian customers. The customer pays in
// their local currency and Bachs settles in USD; the purchase syncs to InsForge
// through the same shared activateSubscription as Paystack, so a buy behaves
// identically regardless of provider.
// Sandbox keys (sk_sandbox_...) must hit the sandbox host; live keys hit prod.
function bachsBase(secret) {
  return secret && secret.startsWith("sk_sandbox_") ? "https://sandbox-api.bachs.io" : "https://api.bachs.io";
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const secret = secrets.get("BACHS_SECRET_KEY");
    if (!secret) return Response.json({ error: "Bachs secret not configured" }, { status: 500 });
    const BACHS_BASE = bachsBase(secret);

    if (action === "initialize") {
      const plan = body.plan;
      let usd;
      let scans = null;
      if (plan === "custom") {
        scans = Math.max(1, Math.min(500, Math.floor(Number(body.scans) || 1)));
        usd = +(scans * SCAN_PRICE).toFixed(2);
      } else {
        usd = PLAN_PRICES[plan];
        if (!usd) return Response.json({ error: "Invalid plan" }, { status: 400 });
      }

      const { finalUsd, couponCode } = await validateCoupon(body.coupon, usd);

      const email = String(user.email || body.email || "").trim();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return Response.json({ error: "A valid email is required to start payment" }, { status: 400 });
      }

      const reference = "teewai_bachs_" + plan + (plan === "custom" ? `_${scans}` : "") + "_" + Date.now();
      const successUrl = body.success_url || "https://teewai.base44.app/checkout?from=bachs";
      const cancelUrl = body.cancel_url || "https://teewai.base44.app/checkout";
      const scansForMeta = scans || (plan === "custom" ? 0 : 0);

      const customer = { email };
      const name = user.display_name || user.full_name || user.username;
      if (name) customer.name = name;

      const res = await fetch(`${BACHS_BASE}/v1/checkout-sessions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          pricing: { currency: "USD", amount: (finalUsd >= 0.99 && finalUsd < 1 ? 1 : finalUsd).toFixed(2) },
          customer,
          reference,
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { plan, scans: scansForMeta, coupon: couponCode, user_id: user.id, reference },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkout_url) {
        const detail = String(data.detail || data.message || data.error || data.error_code || "");
        const minAmount = /amount must be at least/i.test(detail);
        const msg = minAmount
          ? "Bachs requires a minimum purchase of $1.00. Use Paystack for this pack, or choose a larger plan."
          : detail || "Bachs checkout could not start";
        return Response.json({ error: msg }, { status: 400 });
      }
      return Response.json({ checkout_id: data.checkout_id, checkout_url: data.checkout_url, reference, amount: finalUsd, currency: "USD" });
    }

    if (action === "verify") {
      const checkoutId = body.checkout_id;
      if (!checkoutId) return Response.json({ error: "checkout_id required" }, { status: 400 });

      const res = await fetch(`${BACHS_BASE}/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`, {
        headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return Response.json({ error: data.message || "Verification failed" }, { status: 400 });

      const paid = data.status === "completed" && data.charge && data.charge.status === "succeeded";
      if (!paid) return Response.json({ paid: false, status: data.status });

      // Verify the payment belongs to the authenticated user.
      const payerEmail = String(data.customer_details?.email || data.customer?.email || "").toLowerCase().trim();
      const myEmail = String(user.email || "").toLowerCase().trim();
      if (payerEmail && myEmail && payerEmail !== myEmail) {
        return Response.json({ error: "This payment belongs to a different account." }, { status: 403 });
      }

      const meta = data.metadata || {};
      const plan = meta.plan;
      const scans = meta.scans != null && meta.scans !== "" ? Number(meta.scans) : undefined;
      const coupon = meta.coupon;
      const reference = meta.reference || data.reference || checkoutId;

      // Amount validation — the charge is in USD (pricing.currency was USD).
      const paidUsd = data.charge.amount ? +Number(data.charge.amount) : null;
      let expectedUsd = null;
      if (plan === "custom" && scans != null) expectedUsd = +(scans * SCAN_PRICE).toFixed(2);
      else if (PLAN_PRICES[plan] != null) expectedUsd = PLAN_PRICES[plan];
      if (coupon && expectedUsd != null) {
        const { finalUsd } = await validateCoupon(coupon, expectedUsd);
        expectedUsd = finalUsd;
      }
      if (expectedUsd != null && paidUsd != null && expectedUsd > 0 && paidUsd < expectedUsd * 0.95) {
        return Response.json({ error: "Payment amount does not match the selected plan. Please contact support." }, { status: 400 });
      }

      if (coupon) { try { await recordCouponUse(coupon); } catch {} }

      let activation = { bonus: 0, subscription: null };
      try { activation = await activateSubscription(user, plan, scans, reference, paidUsd); }
      catch (e) {
        // Don't silently swallow — a swallowed activation error leaves the
        // user charged but uncredited, and the admin paid-user count never
        // updates. Surface it so the user knows to contact support.
        return Response.json({ error: "Payment received but we couldn't credit your account. Please contact support with reference " + reference }, { status: 500 });
      }

      try {
        const planLabel = PLAN_LABELS[plan] || (plan === "custom" ? "Custom Scan Pack" : plan);
        await sendUserEmail(
          base44,
          user.email,
          "Your teewai order confirmation",
          receiptEmailHtml(
            user.display_name || user.full_name || user.username || "",
            user.email,
            planLabel,
            paidUsd,
            reference,
            data.charge.completed_at || new Date().toISOString(),
            "https://teewai.app",
          ),
          "teewai",
        );
      } catch {}

      return Response.json({ paid: true, reference, plan, scans, bonus: activation.bonus, subscription: activation.subscription });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}