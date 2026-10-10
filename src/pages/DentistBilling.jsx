import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import PlanConfigurator, { priceQuote, PERIODS } from '@/components/dentist/PlanConfigurator';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { loadPaystack, PAYSTACK_PUBLIC_KEY } from '@/lib/paystack';
import { isNativeApp } from '@/lib/isNativeApp';
import { CreditCard, Check, AlertCircle, Loader2, Calendar, Users, RefreshCw } from 'lucide-react';
import PaystackTrustNote from '@/components/PaystackTrustNote';

// Dentist subscription & billing. Seat-based plan with deterministic pricing
// (see PlanConfigurator). Checkout goes through the existing Paystack
// integration. On success a DentistSubscription is created and the
// DentistProfile is flagged subscription_active so the directory ranks this
// dentist first. Slot enforcement and renewal are real.
//
// Paystack checkout calls the `paystack` backend function to initialize and
// verify the transaction, then creates/extends a DentistSubscription on success.

const PERIOD_MONTHS = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12 };

function ngn(n) { return '₦' + Math.round(n).toLocaleString('en-NG'); }

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export default function DentistBilling() {
  const { user, profile, reload } = useOutletContext();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addSlots, setAddSlots] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const subs = await unrufld.entities.DentistSubscription.filter({ dentist_user_id: user.id });
      // Most recent active or expired subscription.
      const latest = subs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      if (latest) {
        // Check expiry.
        const expired = latest.period_end && new Date(latest.period_end) < new Date();
        if (expired && latest.status === 'active') {
          await unrufld.entities.DentistSubscription.update(latest.id, { status: 'expired' });
          latest.status = 'expired';
          if (profile?.id) {
            try { await unrufld.entities.DentistProfile.update(profile.id, { subscription_active: false }); }
            catch (e) { console.error('Failed to clear subscription_active flag:', e); }
          }
        }
        setSub(latest);
      }
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [user, profile]);

  useEffect(() => { load(); }, [load]);

  const handleCheckout = async ({ count, periodKey, quote }) => {
    setSaving(true);
    setError('');
    try {
      // Initialize Paystack transaction via the backend function.
      const initRes = await unrufld.functions.invoke('paystack', {
        action: 'initialize',
        plan: 'dentist_sub',
        amount: quote.total,
        patient_slots: count,
        billing_period: periodKey,
        callback_url: window.location.origin + '/dentist-billing',
      });
      const { reference, amount, currency, email, metadata } = initRes.data;
      if (!reference || !amount) throw new Error(initRes.data?.error || 'Could not start payment');

      const PaystackPop = await loadPaystack();
      const popup = new PaystackPop();
      popup.checkout({
        key: PAYSTACK_PUBLIC_KEY,
        email, amount, currency, reference, metadata,
        channels: ['card', 'bank_transfer', 'ussd', 'bank', 'qr', 'mobile_money'],
        onSuccess: (transaction) => {
          (async () => {
            await activateSubscription(transaction?.reference || reference, count, periodKey, quote);
            setSaving(false);
          })();
        },
        onCancel: () => setSaving(false),
        onError: (err) => { setError(err?.message || 'Payment failed.'); setSaving(false); },
      }).catch(() => setSaving(false));
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Payment could not start. Please try again.');
      setSaving(false);
    }
  };

  const activateSubscription = async (reference, count, periodKey, quote) => {
    const months = PERIOD_MONTHS[periodKey] || 1;
    const now = new Date().toISOString();
    // Renewal before expiry extends from the current period_end; new subs start now.
    const baseStart = sub && sub.status === 'active' && sub.period_end && new Date(sub.period_end) > new Date()
      ? sub.period_end
      : now;
    const periodStart = baseStart;
    const periodEnd = addMonths(baseStart, months);

    const newSlots = addSlots && sub ? sub.patient_slots + count : count;

    if (sub && sub.status === 'active') {
      // Extend / add slots to the existing subscription.
      await unrufld.entities.DentistSubscription.update(sub.id, {
        patient_slots: newSlots,
        period_end: addMonths(baseStart, months),
        amount: (sub.amount || 0) + quote.total,
        billing_period: periodKey,
        period_months: months,
        per_patient_monthly: quote.perPatientMonthly,
        payment_reference: reference,
        purchases: [...(sub.purchases || []), { slots: count, period: periodKey, amount: quote.total, reference, date: now }],
      });
    } else {
      await unrufld.entities.DentistSubscription.create({
        dentist_user_id: user.id,
        dentist_profile_id: profile?.id,
        patient_slots: count,
        billing_period: periodKey,
        period_months: months,
        period_start: periodStart,
        period_end: periodEnd,
        status: 'active',
        amount: quote.total,
        per_patient_monthly: quote.perPatientMonthly,
        payment_reference: reference,
        purchases: [{ slots: count, period: periodKey, amount: quote.total, reference, date: now }],
      });
    }

    // Flag the profile so the directory ranks this dentist first.
    if (profile?.id) {
      try { await unrufld.entities.DentistProfile.update(profile.id, { subscription_active: true }); }
      catch (e) { console.error('Failed to set subscription_active flag:', e); }
    }
    setAddSlots(false);
    await load();
    reload?.();
  };

  if (loading) return <PageSkeleton />;

  const isExpired = sub?.status === 'expired';
  const isActive = sub?.status === 'active' && (!sub.period_end || new Date(sub.period_end) >= new Date());

  // Expired: lock to renewal screen.
  if (isExpired) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-heading font-700 text-lg">Your subscription has expired</h2>
            <p className="text-sm text-muted-foreground mt-1">Renew to keep adding patients and appear as a teewai dentist in the directory. Your patient data is safe.</p>
          </div>
        </div>
        <h1 className="font-heading font-700 text-2xl tracking-tight mb-1">Renew your plan</h1>
        <p className="text-sm text-muted-foreground mb-6">Choose your patient slots and billing period to continue.</p>
        <PlanConfigurator onCheckout={handleCheckout} saving={saving} currentSlots={sub?.patient_slots} />
        <div className="mt-4"><PaystackTrustNote /></div>
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      </div>
    );
  }

  // Active: show current plan + add slots.
  if (isActive) {
    const daysLeft = sub.period_end ? Math.ceil((new Date(sub.period_end) - new Date()) / 86400000) : null;
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="font-heading font-700 text-2xl tracking-tight mb-1">Subscription & Billing</h1>
        <p className="text-sm text-muted-foreground mb-6">Your plan is active.</p>

        <div className="p-6 rounded-2xl border border-olo/20 bg-olo/5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Patient slots</span>
            <span className="font-heading font-700 text-lg">{sub.patient_slots}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2"><CreditCard className="w-4 h-4" /> Per patient per month</span>
            <span className="font-semibold">{ngn(sub.per_patient_monthly || 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Period</span>
            <span className="font-semibold capitalize">{sub.billing_period?.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Renews / expires</span>
            <span className="font-semibold">{sub.period_end ? new Date(sub.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
          </div>
          {daysLeft != null && (
            <div className="h-px bg-olo/15" />
          )}
          {daysLeft != null && (
            <p className="text-sm text-center text-muted-foreground">{daysLeft} day{daysLeft === 1 ? '' : 's'} remaining</p>
          )}
        </div>

        {!addSlots ? (
          <button
            onClick={() => setAddSlots(true)}
            className="w-full inline-flex items-center justify-center gap-2 border border-olo text-olo font-semibold h-12 rounded-xl hover:bg-olo/5 transition-colors"
          >
            <Users className="w-4 h-4" /> Add more slots
          </button>
        ) : (
          <div className="p-6 rounded-2xl border border-border bg-card">
            <h2 className="font-heading font-700 text-lg mb-4">Add patient slots</h2>
            <PlanConfigurator onCheckout={handleCheckout} saving={saving} />
            <div className="mt-4"><PaystackTrustNote /></div>
            <button onClick={() => setAddSlots(false)} className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        )}
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      </div>
    );
  }

  // No subscription: new plan.
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="font-heading font-700 text-2xl tracking-tight mb-1">Choose your plan</h1>
      <p className="text-sm text-muted-foreground mb-6">Pick your patient slots and billing period. You can add more slots anytime.</p>
      <PlanConfigurator onCheckout={handleCheckout} saving={saving} />
      <div className="mt-4"><PaystackTrustNote /></div>
      {error && <p className="text-sm text-destructive mt-3">{error}</p>}
    </div>
  );
}