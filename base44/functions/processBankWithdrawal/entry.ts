import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";

// Processes a single bank withdrawal instantly via Flutterwave.
// Called from the frontend immediately after a bank withdrawal request.
// Verifies the calling user owns the withdrawal, resolves the bank name to a
// Flutterwave bank code, creates a transfer, and updates the record.
// On any failure, refunds the held balance so the user can retry.

const FLUTTERWAVE_BASE = "https://api.flutterwave.com/v3";

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

// Resolve a free-text bank name to a Flutterwave bank code by fetching the
// NG bank list and matching case-insensitively (exact, then contains).
async function resolveBankCode(token, bankName) {
  const res = await fetch(`${FLUTTERWAVE_BASE}/banks?country=NG`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  const banks = Array.isArray(data?.data) ? data.data : [];
  if (!banks.length) return null;

  const query = (bankName || "").trim().toLowerCase();
  // Exact match first
  let match = banks.find((b) => (b.name || "").toLowerCase() === query);
  if (match) return match.code;

  // Common aliases
  const aliases = {
    gtbank: ["gtbank", "gtb", "guaranty trust", "guaranty trust bank"],
    access: ["access bank", "access"],
    zenith: ["zenith", "zenith bank"],
    uba: ["uba", "united bank for africa"],
    firstbank: ["firstbank", "first bank", "first bank of nigeria"],
    fidelity: ["fidelity", "fidelity bank"],
    sterling: ["sterling", "sterling bank"],
    union: ["union bank", "union"],
    ecobank: ["ecobank", "eco bank"],
    wema: ["wema", "wema bank"],
    opay: ["opay", "opera pay"],
    kuda: ["kuda", "kuda bank"],
    palmpay: ["palmpay", "palm pay"],
    moniepoint: ["moniepoint", "monie point"],
  };
  for (const [, keys] of Object.entries(aliases)) {
    if (keys.includes(query)) {
      match = banks.find((b) => keys.includes((b.name || "").toLowerCase()));
      if (match) return match.code;
    }
  }

  // Contains match (typed name is part of bank name or vice versa)
  match = banks.find(
    (b) =>
      (b.name || "").toLowerCase().includes(query) ||
      query.includes((b.name || "").toLowerCase())
  );
  if (match) return match.code;

  return null;
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
    if (withdrawal.withdrawal_type !== "bank") return Response.json({ error: "Not a bank withdrawal" }, { status: 400 });
    if (withdrawal.status !== "pending" && withdrawal.status !== "processing") {
      return Response.json({ error: "Already processed" }, { status: 400 });
    }

    const token = secrets.get("FLUTTERWAVE_SECRET_KEY");
    if (!token) return Response.json({ error: "Flutterwave API key not configured" }, { status: 500 });

    // Resolve bank name → bank code
    const bankCode = await resolveBankCode(token, withdrawal.bank_name);
    if (!bankCode) {
      await base44.asServiceRole.entities.ReferralWithdrawal.update(withdrawal.id, {
        status: "failed",
        processed_date: new Date().toISOString(),
        failure_reason: `Could not match bank name "${withdrawal.bank_name}" to a Flutterwave bank`,
      });
      await refund(base44, withdrawal.user_id, withdrawal.amount);
      return Response.json({ ok: false, error: `Could not recognize "${withdrawal.bank_name}". Please enter the official bank name (e.g. "Access Bank", "GTBank", "Zenith Bank").` }, { status: 400 });
    }

    await base44.asServiceRole.entities.ReferralWithdrawal.update(withdrawal.id, {
      status: "processing",
    });

    const reference = `teewai-wd-${withdrawal.id.slice(-12)}`;
    const amount = Math.round(withdrawal.amount);

    // Retry transient Cloudflare/origin errors (520, 502, 503, 504) up to 2
    // extra times with a 1.5s delay — same strategy as airtime withdrawals.
    const MAX_ATTEMPTS = 3;
    const RETRYABLE_STATUS = new Set([502, 503, 504, 520, 521, 522, 523, 524]);
    let res = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        res = await fetch(`${FLUTTERWAVE_BASE}/transfers`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account_bank: bankCode,
            account_number: String(withdrawal.account_number || "").replace(/\D/g, ""),
            amount,
            narration: "teewai referral withdrawal",
            currency: "NGN",
            reference,
            debit_currency: "NGN",
          }),
        });

        if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        break;
      } catch (e) {
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw e;
      }
    }

    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (res.ok && data?.status === "success") {
      await base44.asServiceRole.entities.ReferralWithdrawal.update(withdrawal.id, {
        status: "completed",
        processed_date: new Date().toISOString(),
        provider_reference: String(data?.data?.reference || reference),
        provider_status: String(data?.data?.status || "success"),
      });
      try {
        await base44.asServiceRole.entities.ReferralAccount.updateMany(
          { user_id: withdrawal.user_id },
          { $inc: { total_withdrawn: amount } }
        );
      } catch {}
      return Response.json({ ok: true, status: "completed", reference });
    } else {
      const isTransient = RETRYABLE_STATUS.has(res.status);
      const rawReason = data?.message || data?.raw || `Flutterwave returned status ${res.status}`;
      const reason = isTransient
        ? "Payment provider temporarily unavailable. Please try again in a moment."
        : rawReason;
      await base44.asServiceRole.entities.ReferralWithdrawal.update(withdrawal.id, {
        status: "failed",
        processed_date: new Date().toISOString(),
        provider_status: `HTTP_${res.status}`,
        failure_reason: rawReason,
      });
      await refund(base44, withdrawal.user_id, withdrawal.amount);
      return Response.json({ ok: false, error: reason }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}