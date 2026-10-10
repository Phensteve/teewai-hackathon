// referral.js — teewai referral system logic.
//
// REWARD STRUCTURE:
//   ₦50 per successful referral, credited immediately from the very first one.
//   A referral is "successful" when the invited user completes their first scan.
//   Withdrawal thresholds: ₦2,000 to bank account, ₦50 to airtime (Peyflex).
//
// ELIGIBILITY:
//   Must have an active paid plan. Unlimited plans (pro/pro_yearly/family_pro)
//   require renewal_date > now. Scan packs require remaining scans > 0.
//   Referral code deactivates when the subscription lapses.
//
// PAYOUTS:
//   Airtime withdrawals are processed instantly via Peyflex when requested.
//   Bank transfers are processed instantly via Flutterwave when requested.
//
// ANTI-EXPLOITATION (defense in depth):
//   1. Self-referral prevention — invited_user_id must differ from referrer_user_id.
//   2. Same-device prevention — the invited user's device fingerprint must not
//      match any device fingerprint previously registered to the referrer.
//   3. Circular-referral prevention — if the invited user already referred the
//      current referrer, block the reverse referral (prevents A→B→A farming).
//   4. RLS enforcement — the Referral entity only allows creation when
//      invited_user_id === current user, so a referrer cannot fabricate a
//      referral record pointing to someone else's account.
//   5. Scan-completion gate — rewards only credit after a real scan, not just
//      signup. Each bot must actually use the app and consume a scan credit.
//   6. Atomic balance updates — uses $inc (not read-then-write) to prevent
//      race conditions that could double-credit or lose increments.
//   7. Idempotent withdrawals — a user can have only one pending withdrawal at
//      a time, and each withdrawal has a unique idempotency key.
//   8. IP/device limiting — the existing checkIpRegistration backend function
//      limits free accounts to 3 per IP; device fingerprinting limits to 3
//      per device. This makes bot farming expensive (each bot needs a unique
//      IP + device + email + scan).

import { unrufld } from '@/api/unrufldClient';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';

export const REWARD_PER_REFERRAL = 50;
export const MIN_WITHDRAWAL = 2000;
export const MIN_AIRTIME_WITHDRAWAL = 50;
export const MAX_FREE_ACCOUNTS_PER_DEVICE = 3;
export const IP_RESET_COOLDOWN_DAYS = 45;

const PAID_PLANS = ['pro', 'pro_yearly', 'pro_weekly', 'family_pro', 'pack_2', 'pack_15', 'pack_30', 'pack_daily', 'family_15', 'custom', 'family_extra_member'];
const UNLIMITED_PLANS = ['pro', 'pro_yearly', 'pro_weekly', 'family_pro'];

// Pack expiry durations in days (must match subscriptionActivation.ts).
const PACK_EXPIRY_DAYS = { pack_2: 30, pack_15: 30, pack_30: 30, pack_daily: 1, family_15: 30, custom: 30, family_extra_member: 30 };

// Generate a 4-digit referral code (0000–9999). Users can set their own code;
// this is the auto-generated default for new accounts and migrated old codes.
export function generateReferralCode() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

// Build the full referral link for sharing (https://teewai.base44.app/register?ref=TEE-XXXXXX).
export function buildReferralLink(code) {
  if (!code) return '';
  // Always point to the live custom domain so shared links work outside the
  // builder preview sandbox.
  return `https://teewai.app/register?ref=${code}`;
}

// Extract a referral code from a URL ?ref= parameter (used on the Register page).
export function extractReferralCodeFromURL() {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get('ref') || '').trim();
    if (!raw) return '';
    // Accept 4-digit codes (0000–9999).
    if (!/^\d{4}$/.test(raw)) return '';
    return raw;
  } catch {
    return '';
  }
}

// Check if a subscription qualifies for the referral program.
export function isEligibleForReferrals(subscription) {
  if (!subscription) return false;
  const plan = subscription.plan;
  if (!plan || plan === 'free') return false;
  if (!PAID_PLANS.includes(plan)) return false;

  if (UNLIMITED_PLANS.includes(plan)) {
    return subscription.renewal_date && new Date(subscription.renewal_date) > new Date();
  }
  // Scan packs: eligible while scans remain AND the pack hasn't expired.
  const limit = subscription.scans_limit || 0;
  const used = subscription.scans_used || 0;
  if (limit - used <= 0) return false;
  // Check the most recent non-expired pack purchase.
  const purchases = Array.isArray(subscription.purchases) ? subscription.purchases : [];
  const now = new Date();
  const hasActivePack = purchases.some((p) => {
    if (!p || !p.plan || PAID_PLANS.indexOf(p.plan) < 0) return false;
    if (UNLIMITED_PLANS.includes(p.plan)) return false;
    const expiryDays = PACK_EXPIRY_DAYS[p.plan] || (p.plan === 'custom' ? 30 : 30);
    const purchaseDate = new Date(p.date);
    const expiryDate = p.expires_at ? new Date(p.expires_at) : new Date(purchaseDate.getTime() + expiryDays * 86400000);
    return expiryDate > now;
  });
  return hasActivePack;
}

// Check if the user's billing has expired (for the Spotify-style expired screen).
export function isBillingExpired(subscription) {
  if (!subscription) return false;
  const plan = subscription.plan;
  if (!UNLIMITED_PLANS.includes(plan)) return false;
  if (!subscription.renewal_date) return false;
  return new Date(subscription.renewal_date) < new Date();
}

// Get or create the user's referral account. Migrates old-format codes
// (TEE-XXXXXX) to 4-digit codes automatically on first access.
// Only creates a new account (with a code) when the user is eligible (paid) —
// free users should not get a referral code until they subscribe.
// The subscription is passed so the account is created with the correct
// code_active, plan_type, and next_billing_date from the very first moment —
// otherwise the code is inactive until the next page load syncs eligibility.
export async function getOrCreateReferralAccount(userId, email, eligible = false, subscription = null) {
  if (!userId) return null;
  try {
    const existing = await unrufld.entities.ReferralAccount.filter({ user_id: userId });
    if (existing.length > 0) {
      const account = existing[0];
      // Migrate old-format codes to 4-digit codes.
      if (account.referral_code && !/^\d{4}$/.test(account.referral_code)) {
        let newCode = generateReferralCode();
        let attempts = 0;
        while (attempts < 5) {
          const clash = await unrufld.entities.ReferralAccount.filter({ referral_code: newCode });
          if (!clash.length) break;
          newCode = generateReferralCode();
          attempts++;
        }
        try {
          await unrufld.entities.ReferralAccount.update(account.id, { referral_code: newCode });
          account.referral_code = newCode;
        } catch {}
      }
      return account;
    }

    // Don't create a referral account (or code) for free users — codes are
    // only issued after the user has an active paid plan.
    if (!eligible) return null;

    // Generate a unique code (retry on collision).
    let code = generateReferralCode();
    let attempts = 0;
    while (attempts < 5) {
      const clash = await unrufld.entities.ReferralAccount.filter({ referral_code: code });
      if (!clash.length) break;
      code = generateReferralCode();
      attempts++;
    }

    const plan = subscription?.plan || 'free';
    const nextBilling = subscription?.renewal_date || null;
    const account = await unrufld.entities.ReferralAccount.create({
      user_id: userId,
      referral_code: code,
      balance_naira: 0,
      total_earned: 0,
      total_withdrawn: 0,
      successful_referrals: 0,
      pending_referrals: 0,
      code_active: eligible,
      plan_type: plan,
      last_billing_date: nextBilling ? new Date().toISOString() : null,
      next_billing_date: nextBilling,
    });
    return account;
  } catch {
    return null;
  }
}

// Check if the user's referral code is locked (has been used for a real referral).
// Once locked, the code cannot be changed.
export async function isCodeLocked(userId) {
  if (!userId) return false;
  try {
    const referrals = await unrufld.entities.Referral.filter({ referrer_user_id: userId });
    return referrals.some((r) => r.status === 'pending' || r.status === 'scanned' || r.status === 'rewarded');
  } catch {
    return false;
  }
}

// Set a custom 4-digit referral code. Fails if the current code is locked
// (has been used) or the new code is already taken by another user.
export async function setReferralCode(userId, newCode) {
  if (!userId) return { ok: false, error: 'User ID required' };
  const normalized = String(newCode || '').trim();
  if (!/^\d{4}$/.test(normalized)) {
    return { ok: false, error: 'Code must be exactly 4 digits (0000–9999).' };
  }
  try {
    const accounts = await unrufld.entities.ReferralAccount.filter({ user_id: userId });
    const account = accounts[0];
    if (!account) return { ok: false, error: 'No referral account found.' };

    // No-op if the code is already set to the requested value.
    if (account.referral_code === normalized) return { ok: true, code: normalized };

    // Check if the current code is locked.
    const locked = await isCodeLocked(userId);
    if (locked) {
      return { ok: false, error: 'Your code has been used and can no longer be changed.' };
    }

    // Check if the new code is available.
    const clash = await unrufld.entities.ReferralAccount.filter({ referral_code: normalized });
    if (clash.length > 0) {
      return { ok: false, error: 'That code is already taken. Try another.' };
    }

    await unrufld.entities.ReferralAccount.update(account.id, { referral_code: normalized });
    return { ok: true, code: normalized };
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to set code.' };
  }
}

// Update the account's eligibility based on the current subscription.
export async function syncReferralEligibility(userId, subscription) {
  if (!userId) return;
  try {
    const accounts = await unrufld.entities.ReferralAccount.filter({ user_id: userId });
    const account = accounts[0];
    if (!account) return;

    const eligible = isEligibleForReferrals(subscription);
    const plan = subscription?.plan || 'free';
    const nextBilling = subscription?.renewal_date || null;

    if (account.code_active !== eligible || account.plan_type !== plan || account.next_billing_date !== nextBilling) {
      await unrufld.entities.ReferralAccount.update(account.id, {
        code_active: eligible,
        plan_type: plan,
        last_billing_date: nextBilling ? new Date().toISOString() : account.last_billing_date,
        next_billing_date: nextBilling,
      });
    }
  } catch {}
}

// Look up a referral code and check if it's active.
export async function validateReferralCode(code) {
  if (!code) return null;
  const normalized = code.trim();
  if (!/^\d{4}$/.test(normalized)) return { valid: false, reason: 'invalid_format' };
  try {
    const accounts = await unrufld.entities.ReferralAccount.filter({ referral_code: normalized });
    if (!accounts.length) return { valid: false, reason: 'not_found' };
    const account = accounts[0];
    if (!account.code_active) return { valid: false, reason: 'inactive' };
    return { valid: true, account };
  } catch {
    return null;
  }
}

// Create a referral record when an invited user signs up with a code.
// Stores the referral code in localStorage so it survives the OTP flow.
export function storePendingReferralCode(code) {
  if (!code) return;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  try { localStorage.setItem('teewai_referral_code', normalized); } catch {}
}

export function getPendingReferralCode() {
  try { return localStorage.getItem('teewai_referral_code') || ''; } catch { return ''; }
}

export function clearPendingReferralCode() {
  try { localStorage.removeItem('teewai_referral_code'); } catch {}
}

// After the invited user is authenticated, create the Referral record.
// Delegates to the referralReward backend function (createReferral op) which
// uses the service role to bypass ReferralAccount RLS — the client-side
// filter({ referral_code }) could never read the referrer's account (RLS only
// allows reading your own), so referrals were silently dropped for every user.
// The backend function also runs all anti-exploitation checks server-side.
export async function createReferralFromStoredCode(invitedUser) {
  if (!invitedUser?.id) return null;
  const code = getPendingReferralCode();
  if (!code) return null;

  try {
    let deviceHash = null;
    try { deviceHash = await getDeviceFingerprint(); } catch {}

    const response = await unrufld.functions.invoke('referralReward', {
      op: 'createReferral',
      code,
      device_hash: deviceHash,
    });
    const result = response?.data;

    // Clear the stored code once the backend has processed it (success or
    // blocked). Don't clear on network errors so the user can retry.
    if (result && (result.ok || result.blocked || result.existing || result.reason)) {
      clearPendingReferralCode();
    }

    if (result?.blocked) return { blocked: true, reason: result.reason };
    if (result?.ok) return { ok: true, referral_id: result.referral_id };
    if (result?.existing) return { ok: true, existing: true };
    return null;
  } catch {
    return null;
  }
}

// Mark a referral as scanned when the invited user completes their first scan.
// Credits ₦50 to the referrer once per referral. Delegates to the referralReward
// backend function, which claims the referral atomically (updateMany with a
// status:"pending" filter + unique claim token) to eliminate the race condition
// where two concurrent calls could both find the referral as "pending" and
// double-credit the reward. The backend function also does the balance $inc
// atomically in the same claim, so there is no find-then-write window.
export async function markReferralScanned() {
  try {
    await unrufld.functions.invoke('referralReward', { op: 'markScanned' });
  } catch {}
}

// Compute the next batch time (6am, 12pm, 6pm WAT = UTC+1).
export function computeNextBatchTime() {
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24; // WAT = UTC+1
  const batches = [6, 12, 18];

  let nextBatchHour = batches.find((h) => h > watHour);
  let batchDate = new Date(now);

  if (nextBatchHour === undefined) {
    nextBatchHour = 6;
    batchDate.setUTCDate(batchDate.getUTCDate() + 1);
  }

  // Convert WAT hour to UTC hour.
  const utcHour = (nextBatchHour - 1 + 24) % 24;
  batchDate.setUTCHours(utcHour, 0, 0, 0);

  return {
    batch_time: `${String(nextBatchHour).padStart(2, '0')}:00`,
    batch_date: batchDate.toISOString().split('T')[0],
    batch_datetime: batchDate.toISOString(),
  };
}

// Request a withdrawal. The check-create-deduct is delegated to the
// requestWithdrawal backend function (service role) so the single-active-
// withdrawal guard and balance deduction are atomic — the old client-side
// read-then-write could be raced to double-withdraw. After the backend
// creates the record and deducts the balance, the client invokes the
// processing function (airtime via Peyflex, bank via Flutterwave).
export async function requestWithdrawal(userId, amount, details) {
  const type = details.withdrawal_type || 'bank';
  const minAmount = type === 'airtime' ? MIN_AIRTIME_WITHDRAWAL : MIN_WITHDRAWAL;
  if (!userId || amount < minAmount) {
    return { ok: false, error: `Minimum ${type} withdrawal is ₦${minAmount.toLocaleString()}` };
  }

  try {
    // Atomically check + create + deduct on the server.
    const reqResponse = await unrufld.functions.invoke('requestWithdrawal', {
      amount,
      withdrawal_type: type,
      bank_name: details.bank_name || '',
      account_number: details.account_number || '',
      account_name: details.account_name || '',
      phone_number: details.phone_number || '',
    });
    const reqResult = reqResponse?.data;
    if (!reqResult?.ok || !reqResult.withdrawal_id) {
      return { ok: false, error: reqResult?.error || 'Withdrawal request failed.' };
    }
    const withdrawalId = reqResult.withdrawal_id;

    // Airtime: process instantly via Peyflex.
    if (type === 'airtime') {
      try {
        const response = await unrufld.functions.invoke('processAirtimeWithdrawals', {
          withdrawal_id: withdrawalId,
        });
        const result = response?.data;
        if (result?.ok) {
          return { ok: true, instant: true };
        }
        return { ok: false, error: result?.error || 'Airtime delivery failed. Your balance has been refunded.' };
      } catch (e) {
        return { ok: false, error: e?.response?.data?.error || e?.message || 'Airtime delivery failed. Your balance has been refunded.' };
      }
    }

    // Bank: process instantly via Flutterwave.
    if (type === 'bank') {
      try {
        const response = await unrufld.functions.invoke('processBankWithdrawal', {
          withdrawal_id: withdrawalId,
        });
        const result = response?.data;
        if (result?.ok) {
          return { ok: true, instant: true };
        }
        return { ok: false, error: result?.error || 'Bank transfer failed. Your balance has been refunded.' };
      } catch (e) {
        return { ok: false, error: e?.response?.data?.error || e?.message || 'Bank transfer failed. Your balance has been refunded.' };
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.response?.data?.error || e?.message || 'Withdrawal request failed.' };
  }
}

// Get the user's referral list.
export async function getReferralList(userId) {
  if (!userId) return [];
  try {
    return await unrufld.entities.Referral.filter({ referrer_user_id: userId }, '-created_date', 50);
  } catch {
    return [];
  }
}

// Get the user's withdrawal history.
export async function getWithdrawalList(userId) {
  if (!userId) return [];
  try {
    return await unrufld.entities.ReferralWithdrawal.filter({ user_id: userId }, '-created_date', 20);
  } catch {
    return [];
  }
}

// Check if the user can reset their IP/device association (once per 45 days).
export async function canResetIpMatch(userId) {
  if (!userId) return { canReset: true };
  try {
    const changes = await unrufld.entities.IpAccountMatchChange.filter({ user_id: userId }, '-change_date', 1);
    if (!changes.length) return { canReset: true };
    const lastChange = changes[0];
    const nextAllowed = new Date(lastChange.change_date);
    nextAllowed.setDate(nextAllowed.getDate() + IP_RESET_COOLDOWN_DAYS);
    if (new Date() >= nextAllowed) return { canReset: true };
    return { canReset: false, nextAllowedDate: nextAllowed.toISOString() };
  } catch {
    return { canReset: true };
  }
}