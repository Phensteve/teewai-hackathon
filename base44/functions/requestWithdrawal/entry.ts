import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

// Atomically requests a referral withdrawal: checks for an active withdrawal,
// verifies the balance, creates the withdrawal record, and deducts the
// balance — all server-side with the service role so there is no
// read-then-write race window (the client-side version could be raced to
// double-withdraw). Returns the withdrawal ID so the client can then invoke
// the processing function (processAirtimeWithdrawals / processBankWithdrawal).

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const type = body.withdrawal_type === "airtime" ? "airtime" : "bank";
    const minAmount = type === "airtime" ? 50 : 2000;

    if (!Number.isFinite(amount) || amount < minAmount) {
      return Response.json({ ok: false, error: `Minimum ${type} withdrawal is ₦${minAmount.toLocaleString()}` }, { status: 400 });
    }
    if (amount % 50 !== 0) {
      return Response.json({ ok: false, error: "Amount must be in multiples of ₦50." }, { status: 400 });
    }

    // Single-active-withdrawal guard (service role bypasses RLS).
    const active = await base44.asServiceRole.entities.ReferralWithdrawal.filter({ user_id: user.id });
    const hasActive = active.some((w) => w.status === "pending" || w.status === "processing");
    if (hasActive) {
      return Response.json({ ok: false, error: "You already have an active withdrawal request." }, { status: 400 });
    }

    // Verify sufficient balance.
    const accounts = await base44.asServiceRole.entities.ReferralAccount.filter({ user_id: user.id });
    const account = accounts[0];
    if (!account || (account.balance_naira || 0) < amount) {
      return Response.json({ ok: false, error: "Insufficient balance." }, { status: 400 });
    }

    // Create the withdrawal record.
    const idempotencyKey = `wd-${user.id}-${Date.now()}`;
    const withdrawal = await base44.asServiceRole.entities.ReferralWithdrawal.create({
      user_id: user.id,
      amount,
      withdrawal_type: type,
      bank_name: body.bank_name || "",
      account_number: body.account_number || "",
      account_name: body.account_name || "",
      phone_number: body.phone_number || "",
      status: "pending",
      requested_date: new Date().toISOString(),
      idempotency_key: idempotencyKey,
    });

    // Atomically deduct the balance (held until processed).
    try {
      await base44.asServiceRole.entities.ReferralAccount.updateMany(
        { user_id: user.id },
        { $inc: { balance_naira: -amount } }
      );
    } catch {
      await base44.asServiceRole.entities.ReferralAccount.update(account.id, {
        balance_naira: (account.balance_naira || 0) - amount,
      });
    }

    return Response.json({ ok: true, withdrawal_id: withdrawal.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}