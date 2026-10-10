import { unrufld } from '@/api/unrufldClient';

// Verify a Bachs.io checkout session and activate the plan, mirroring the
// Paystack verify flow. Returns { ok, plan, scans, reference, subscription, error }.
export async function verifyAndActivateBachs(checkoutId, planHint) {
  if (!checkoutId) return { ok: false, error: 'No checkout id.' };
  try {
    const res = await unrufld.functions.invoke('bachs', { action: 'verify', checkout_id: checkoutId });
    if (!res.data.paid) {
      return { ok: false, error: 'Payment could not be verified. If you were charged, contact support.' };
    }
    const stored = JSON.parse(sessionStorage.getItem('teewai_bachs') || '{}');
    const planId = res.data.plan || planHint || stored.plan;
    const scansBought = res.data.scans || stored.scans || 0;
    if (!planId) return { ok: false, error: 'Could not determine the plan you paid for. Contact support.' };
    if (!res.data.subscription) return { ok: false, error: 'Could not find your account. Contact support.' };
    return { ok: true, plan: planId, scans: scansBought, bonus: res.data.bonus || 0, reference: res.data.reference, subscription: res.data.subscription };
  } catch (e) {
    return { ok: false, error: e?.message || 'Payment verification failed.' };
  }
}