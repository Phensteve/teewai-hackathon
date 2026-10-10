import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { DeviceFingerprint } from '../../shared/securityInsforge.ts';

// Referral backend: creation + reward processing. Both ops use the service
// role to bypass ReferralAccount/Referral RLS — the client-side
// createReferralFromStoredCode could never look up the referrer's account
// (ReferralAccount RLS only allows reading your own), so referrals were
// silently dropped for every user.
//
// createReferral: looks up the referrer by code, runs anti-exploitation
// checks (self-referral, same-device, circular, duplicate), creates the
// Referral record, and increments the referrer's pending count.
//
// markScanned: atomically claims a pending referral (updateMany with a
// status:"pending" filter + unique claim token) and credits the ₦50 reward,
// eliminating the race condition where concurrent calls could double-credit.

const REWARD = 50;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { op } = body;

    if (op === "createReferral") {
      // Create a referral record when an invited user signs up with a code.
      // The client passes the code (from localStorage) and optional device hash.
      const code = String(body.code || "").trim();
      if (!code) return Response.json({ ok: false, error: "no_code" });

      // Look up the referrer's account by code (service role bypasses RLS).
      const accounts = await base44.asServiceRole.entities.ReferralAccount.filter({ referral_code: code });
      if (!accounts || !accounts.length) return Response.json({ ok: false, reason: "not_found" });
      const referrerAccount = accounts[0];
      if (!referrerAccount.code_active) return Response.json({ ok: false, reason: "inactive" });

      const referrerUserId = referrerAccount.user_id;

      // ── Anti-exploitation: self-referral ──
      if (user.id === referrerUserId) return Response.json({ ok: false, blocked: true, reason: "self_referral" });

      // ── Anti-exploitation: same device fingerprint ──
      const invitedDeviceHash = body.device_hash;
      if (invitedDeviceHash) {
        try {
          const referrerDevices = await DeviceFingerprint.filter({ user_id: referrerUserId });
          if (referrerDevices.some((d) => d.device_hash === invitedDeviceHash)) {
            await base44.asServiceRole.entities.Referral.create({
              referrer_user_id: referrerUserId,
              referrer_code: code,
              invited_user_id: user.id,
              invited_email: user.email || "",
              invited_username: user.username || user.display_name || "",
              status: "expired",
              reward_amount: 0,
              blocked_reason: "same_device",
            });
            return Response.json({ ok: false, blocked: true, reason: "same_device" });
          }
        } catch {}
      }

      // ── Anti-exploitation: circular referral ──
      try {
        const reverseReferrals = await base44.asServiceRole.entities.Referral.filter({
          referrer_user_id: user.id,
          invited_user_id: referrerUserId,
        });
        if (reverseReferrals.length > 0) return Response.json({ ok: false, blocked: true, reason: "circular" });
      } catch {}

      // ── Anti-exploitation: duplicate ──
      const existing = await base44.asServiceRole.entities.Referral.filter({
        referrer_user_id: referrerUserId,
        invited_user_id: user.id,
      });
      if (existing.length > 0) return Response.json({ ok: true, existing: true });

      // All checks passed — create the referral record.
      const referral = await base44.asServiceRole.entities.Referral.create({
        referrer_user_id: referrerUserId,
        referrer_code: code,
        invited_user_id: user.id,
        invited_email: user.email || "",
        invited_username: user.username || user.display_name || "",
        status: "pending",
        reward_amount: REWARD,
      });

      // Atomically increment the referrer's pending count.
      await base44.asServiceRole.entities.ReferralAccount.updateMany(
        { user_id: referrerUserId },
        { $inc: { pending_referrals: 1 } }
      );

      return Response.json({ ok: true, referral_id: referral.id });
    }

    if (op === "markScanned") {
      // Find the pending referral for this invited user.
      const referrals = await base44.asServiceRole.entities.Referral.filter({
        invited_user_id: user.id,
        status: "pending",
      });
      if (!referrals || !referrals.length) {
        return Response.json({ ok: true, credited: false, reason: "no_pending" });
      }
      const referral = referrals[0];
      const now = new Date().toISOString();
      const claimToken = `claim-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Atomically claim: only updates if status is still "pending".
      await base44.asServiceRole.entities.Referral.updateMany(
        { id: referral.id, status: "pending" },
        {
          $set: {
            status: "rewarded",
            scan_completed_date: now,
            reward_credited_date: now,
            reward_pair_id: claimToken,
          },
        }
      );

      // Re-read to verify our claim token won the race.
      const updated = await base44.asServiceRole.entities.Referral.get(referral.id);
      if (!updated || updated.reward_pair_id !== claimToken) {
        return Response.json({ ok: true, credited: false, reason: "already_claimed" });
      }

      // Credit the reward atomically. successful_referrals +1, pending_referrals -1,
      // balance_naira +50, total_earned +50 — all in one atomic $inc.
      await base44.asServiceRole.entities.ReferralAccount.updateMany(
        { user_id: referral.referrer_user_id },
        {
          $inc: {
            balance_naira: REWARD,
            total_earned: REWARD,
            successful_referrals: 1,
            pending_referrals: -1,
          },
        }
      );

      return Response.json({ ok: true, credited: true, referral_id: referral.id });
    }

    return Response.json({ error: `Unknown op "${op}"` }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}