import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";

// Processes a single airtime withdrawal instantly via Peyflex.
// Called from the frontend immediately after an airtime withdrawal request.
// Verifies the calling user owns the withdrawal, detects the network from the
// phone number, calls Peyflex's airtime topup API, and updates the record.
// On any failure, refunds the held balance so the user can retry.

const PEYFLEX_BASE = "https://client.peyflex.com.ng";

const NETWORK_PREFIXES = {
  mtn: ["0803", "0806", "0703", "0706", "0813", "0814", "0816", "0903", "0906", "0913", "0916"],
  airtel: ["0802", "0808", "0708", "0812", "0701", "0902", "0901", "0904", "0907", "0912"],
  glo: ["0805", "0807", "0705", "0811", "0815", "0905", "0915"],
  "9mobile": ["0809", "0817", "0818", "0908", "0909"],
};

function detectNetwork(phone) {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("234")) d = "0" + d.slice(3);
  if (d.length < 4) return null;
  const prefix = d.slice(0, 4);
  for (const [network, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.includes(prefix)) return network;
  }
  return null;
}

function normalizePhone(phone) {
  let d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("234")) d = "0" + d.slice(3);
  return d;
}

async function refund(base44, userId, amount) {
  try {
    await base44.asServiceRole.entities.ReferralAccount.updateMany(
      { user_id: userId },
      { $inc: { balance_naira: amount } }
    );
  } catch {
    const accts = await base44.asServiceRole.entities.ReferralAccount.filter({ user_id: userId });
    if (accts.length) {
      await base44.asServiceRole.entities.ReferralAccount.update(accts[0].id, {
        balance_naira: (accts[0].balance_naira || 0) + amount,
      });
    }
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const withdrawalId = body.withdrawal_id;
    if (!withdrawalId) return Response.json({ error: "withdrawal_id required" }, { status: 400 });

    const withdrawal = await base44.asServiceRole.entities.ReferralWithdrawal.get(withdrawalId);
    if (!withdrawal) return Response.json({ error: "Withdrawal not found" }, { status: 404 });
    if (withdrawal.user_id !== user.id) return Response.json({ error: "Not your withdrawal" }, { status: 403 });
    if (withdrawal.withdrawal_type !== "airtime") return Response.json({ error: "Not an airtime withdrawal" }, { status: 400 });
    if (withdrawal.status !== "pending" && withdrawal.status !== "processing") {
      return Response.json({ error: "Already processed" }, { status: 400 });
    }

    const token = secrets.get("PEYFLEX_API_TOKEN");
    if (!token) return Response.json({ error: "Peyflex API token not configured" }, { status: 500 });

    const network = detectNetwork(withdrawal.phone_number);
    const phone = normalizePhone(withdrawal.phone_number);

    if (!network) {
      await base44.asServiceRole.entities.ReferralWithdrawal.update(withdrawal.id, {
        status: "failed",
        processed_date: new Date().toISOString(),
        failure_reason: "Could not detect network from phone number",
      });
      await refund(base44, withdrawal.user_id, withdrawal.amount);
      return Response.json({ ok: false, error: "Could not detect network from phone number" }, { status: 400 });
    }

    await base44.asServiceRole.entities.ReferralWithdrawal.update(withdrawal.id, {
      status: "processing",
    });

    // Retry transient Cloudflare/origin errors (520, 502, 503, 504) up to 2
    // extra times with a 1.5s delay. These are server-side hiccups on Peyflex's
    // end that typically resolve on retry — without this, a single 520 fails
    // the withdrawal and the user must manually retry.
    const MAX_ATTEMPTS = 3;
    const RETRYABLE_STATUS = new Set([502, 503, 504, 520, 521, 522, 523, 524]);
    let res = null;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        res = await fetch(`${PEYFLEX_BASE}/api/airtime/topup/`, {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            network,
            amount: Math.round(withdrawal.amount),
            mobile_number: phone,
          }),
        });

        // If the response is retryable, wait and retry.
        if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        break; // success or non-retryable status
      } catch (e) {
        lastError = e;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw e;
      }
    }

    try {
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      if (res.ok && data.status === "SUCCESS") {
        await base44.asServiceRole.entities.ReferralWithdrawal.update(withdrawal.id, {
          status: "completed",
          processed_date: new Date().toISOString(),
          provider_reference: data.reference || "",
          provider_status: data.status || "SUCCESS",
          provider_network: network,
        });
        // Track total withdrawn for accounting accuracy (balance was already
        // deducted at request time; this records the completed disbursement).
        try {
          await base44.asServiceRole.entities.ReferralAccount.updateMany(
            { user_id: withdrawal.user_id },
            { $inc: { total_withdrawn: Math.round(withdrawal.amount) } }
          );
        } catch {}
        return Response.json({ ok: true, status: "completed", reference: data.reference });
      } else {
        // For transient provider errors (5xx/Cloudflare), show a clear
        // message instead of the raw HTML error page ("error code: 520").
        const isTransient = RETRYABLE_STATUS.has(res.status);
        const rawReason = data.message || data.raw || `Peyflex returned status ${res.status}`;
        const reason = isTransient
          ? "Payment provider temporarily unavailable. Please try again in a moment."
          : rawReason;
        await base44.asServiceRole.entities.ReferralWithdrawal.update(withdrawal.id, {
          status: "failed",
          processed_date: new Date().toISOString(),
          provider_status: data.status || `HTTP_${res.status}`,
          provider_network: network,
          failure_reason: rawReason,
        });
        await refund(base44, withdrawal.user_id, withdrawal.amount);
        return Response.json({ ok: false, error: reason }, { status: 400 });
      }
    } catch (e) {
      // Network/API error — mark failed and refund so the user can retry.
      await base44.asServiceRole.entities.ReferralWithdrawal.update(withdrawal.id, {
        status: "failed",
        processed_date: new Date().toISOString(),
        failure_reason: e.message || "Network error contacting Peyflex",
      });
      await refund(base44, withdrawal.user_id, withdrawal.amount);
      return Response.json({ ok: false, error: e.message || "Network error contacting Peyflex" }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}