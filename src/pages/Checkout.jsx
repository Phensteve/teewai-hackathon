import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { useCurrency } from '@/hooks/use-currency';
import CurrencySwitcher from '@/components/CurrencySwitcher';
import { ShieldCheck, CreditCard, Lock, Tag, Loader2, ExternalLink, CheckCircle, ArrowLeftRight, AlertCircle, Globe } from 'lucide-react';
import { isNativeApp } from '@/lib/isNativeApp';
import { loadPaystack, PAYSTACK_PUBLIC_KEY } from '@/lib/paystack';
import { verifyAndActivateBachs } from '@/lib/bachs';
import ApplePayMark from '@/components/ApplePayMark';
import PaystackTrustNote from '@/components/PaystackTrustNote';
import BackButton from '@/components/BackButton';
import { USD_FOR, PLAN_LABELS, SCANS_FOR, computeDiscountedUsd, couponExceedsPrice, freeActivate, canApplePay, getEarlyAdopter, verifyAndActivate, USD_TO_NGN, PACK_EXPIRY_DAYS } from '@/lib/payment';

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { format, refreshRates, currency } = useCurrency();
  const { plan, scans, coupon } = location.state || {};
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [applePay, setApplePay] = useState(false);
  const [earlyAdopter, setEarlyAdopter] = useState(null);
  const [showExcessConfirm, setShowExcessConfirm] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [payMethod, setPayMethod] = useState(() => {
    try { return localStorage.getItem('teewai_currency') === 'NGN' ? 'paystack' : 'bachs'; } catch { return 'bachs'; }
  });
  const WEB_APP_URL = 'https://teewai.base44.app';
  const isNgn = currency === 'NGN';
  // Paystack is recommended for Nigerian users (Naira), Bachs for everyone else.
  const recommended = isNgn ? 'paystack' : 'bachs';

  useEffect(() => {
    setApplePay(canApplePay());
    getEarlyAdopter().then(setEarlyAdopter);
    // Refresh live exchange rates every time a user opens checkout so the
    // displayed price in their chosen currency is accurate right before they pay.
    refreshRates();
    // Funnel analytics: checkout view (denominator for paywall→checkout and
    // checkout→complete rates). audit item N.
    if (plan) unrufld.analytics.track({ eventName: 'checkout_view', properties: { plan, scans: plan === 'custom' ? scans : SCANS_FOR(plan) } });
  }, []);

  // bfcache restore: when the user navigates back from Bachs's hosted checkout
  // without paying, the browser restores this page from the back-forward cache
  // with `processing` still true (set before we navigated away). Reset it so
  // the spinner doesn't spin forever.
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) { setProcessing(false); setVerifying(false); }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  // Handle a full-page return from Paystack (?reference=...).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    const checkoutId = params.get('checkout_id');
    const fromApp = params.get('from') === 'app';
    const fromBachs = params.get('from') === 'bachs';
    if (fromBachs) {
      // Bachs redirects to the success_url with `?from=bachs` but does NOT
      // always append checkout_id as a query param. Fall back to the id we
      // stored in sessionStorage before redirecting — without this, the
      // verify never fires and the payment is never credited.
      const bachsId = checkoutId || (() => { try { return JSON.parse(sessionStorage.getItem('teewai_bachs') || '{}').checkout_id; } catch { return null; } })();
      if (bachsId) {
        window.history.replaceState({}, '', '/checkout');
        (async () => {
          setVerifying(true);
          const res = await verifyAndActivateBachs(bachsId, plan);
          setVerifying(false);
          if (res.ok) { sessionStorage.removeItem('teewai_bachs'); navigate('/thank-you', { state: { plan: res.plan, scans: res.scans, reference: res.reference }, replace: true }); }
          else setError(res.error);
        })();
        return;
      }
    }
    if (!reference) return;
    window.history.replaceState({}, '', '/checkout');
    (async () => {
      setVerifying(true);
      const res = await verifyAndActivate(reference, plan, earlyAdopter);
      setVerifying(false);
      if (res.ok) navigate('/thank-you', { state: { plan: res.plan, scans: res.scans, reference: res.reference, fromApp }, replace: true });
      else setError(res.error);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-verify when the app regains focus after the external browser payment.
  useEffect(() => {
    if (!waitingForPayment) return;
    const checkPayment = async () => {
      if (document.hidden) return;
      const storedPay = JSON.parse(sessionStorage.getItem('teewai_pay') || '{}');
      const storedBachs = JSON.parse(sessionStorage.getItem('teewai_bachs') || '{}');
      if (storedBachs.checkout_id) {
        setVerifying(true);
        const res = await verifyAndActivateBachs(storedBachs.checkout_id, storedBachs.plan);
        setVerifying(false);
        if (res.ok) {
          sessionStorage.removeItem('teewai_bachs');
          setWaitingForPayment(false);
          navigate('/thank-you', { state: { plan: res.plan, scans: res.scans, reference: res.reference }, replace: true });
        }
        return;
      }
      if (!storedPay.reference || !storedPay.native) return;
      setVerifying(true);
      const res = await verifyAndActivate(storedPay.reference, storedPay.plan, earlyAdopter);
      setVerifying(false);
      if (res.ok) {
        sessionStorage.removeItem('teewai_pay');
        setWaitingForPayment(false);
        navigate('/thank-you', { state: { plan: res.plan, scans: res.scans, reference: res.reference }, replace: true });
      }
    };
    const onVisible = () => { if (!document.hidden) checkPayment(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', checkPayment);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', checkPayment);
    };
  }, [waitingForPayment, earlyAdopter, navigate]);

  if (!plan) return <Navigate to="/subscription" replace />;

  const priceUsd = USD_FOR(plan, scans);
  const scansCount = plan === 'custom' ? scans : SCANS_FOR(plan);
  const isUnlimited = plan === 'pro' || plan === 'pro_yearly' || plan === 'family_pro' || plan === 'pro_weekly';
  const finalUsd = computeDiscountedUsd(priceUsd, coupon);
  const discountUsd = +(priceUsd - finalUsd).toFixed(2);
  const isFree = finalUsd <= 0;
  const isExcess = couponExceedsPrice(priceUsd, coupon);
  // The exact NGN amount Paystack will charge — matches the backend's
  // Math.round(finalUsd * USD_TO_NGN * 100) kobo conversion exactly, so the
  // number the user sees is the number they pay (no live-rate surprise).
  const chargeNgn = Math.round(finalUsd * USD_TO_NGN);
  // Bachs needs at least $1: the $0.99 pack is rounded up to $1, anything
  // cheaper is Paystack-only.
  const bachsAllowed = finalUsd >= 0.99;
  const bachsUsd = finalUsd < 1 ? 1 : finalUsd;
  const method = bachsAllowed ? payMethod : 'paystack';

  const startPayment = async (channels) => {
    setProcessing(true);
    setError('');
    try {
      const initRes = await unrufld.functions.invoke('paystack', {
        action: 'initialize',
        plan,
        scans,
        coupon: coupon?.code,
      });
      const { reference, amount, currency, email, metadata } = initRes.data;
      if (!reference || !amount) throw new Error(initRes.data?.error || "We couldn't start your payment. Check your connection and try again.");
      sessionStorage.setItem('teewai_pay', JSON.stringify({ reference, plan, scans }));

      const PaystackPop = await loadPaystack();
      const popup = new PaystackPop();
      popup.checkout({
        key: PAYSTACK_PUBLIC_KEY,
        email, amount, currency, reference, metadata,
        channels,
        onSuccess: (transaction) => {
          (async () => {
            setVerifying(true);
            const res = await verifyAndActivate(transaction?.reference || reference, plan, earlyAdopter);
            setVerifying(false);
            setProcessing(false);
            if (res.ok) navigate('/thank-you', { state: { plan: res.plan, scans: res.scans, reference: res.reference }, replace: true });
            else setError(res.error);
          })();
        },
        onCancel: () => setProcessing(false),
        onError: (err) => { setError(err?.message || "Your payment didn't go through. No charge was made — try again, or use a different card."); setProcessing(false); },
      }).catch(() => setProcessing(false));
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Your payment didn't go through. No charge was made — try again, or use a different card.");
      setProcessing(false);
    }
  };

  // === WEB-TO-APP PAYMENT FUNNEL ===
  // When running inside the APK, Google Play takes 30% of in-app payments.
  // To avoid this, we open the Paystack checkout in the SYSTEM browser (not
  // the WebView). The user pays on the external page, Paystack redirects to
  // the web app which verifies the payment, and the user returns to the app.
  // When the app regains focus, we verify the reference and continue.
  const startPaymentNative = async () => {
    setProcessing(true);
    setError('');
    try {
      const initRes = await unrufld.functions.invoke('paystack', {
        action: 'initialize',
        plan,
        scans,
        coupon: coupon?.code,
        callback_url: WEB_APP_URL + '/checkout?from=app',
      });
      const { reference, authorization_url } = initRes.data;
      if (!reference || !authorization_url) throw new Error(initRes.data?.error || "We couldn't start your payment. Check your connection and try again.");
      sessionStorage.setItem('teewai_pay', JSON.stringify({ reference, plan, scans, native: true }));
      window.open(authorization_url, '_blank');
      setProcessing(false);
      setWaitingForPayment(true);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Your payment didn't go through. No charge was made — try again, or use a different card.");
      setProcessing(false);
    }
  };

  // Bachs.io hosted checkout — for non-Nigerian customers. Creates a checkout
  // session and sends the user to Bachs's hosted page; on return the
  // ?checkout_id= effect (or the focus-poll for the APK) verifies and activates.
  const startBachs = async () => {
    setProcessing(true);
    setError('');
    try {
      const initRes = await unrufld.functions.invoke('bachs', {
        action: 'initialize',
        plan,
        scans,
        coupon: coupon?.code,
        success_url: WEB_APP_URL + '/checkout?from=bachs',
        cancel_url: WEB_APP_URL + '/checkout',
      });
      const { checkout_url, checkout_id } = initRes.data;
      if (!checkout_url) throw new Error(initRes.data?.error || "We couldn't start your payment. Check your connection and try again.");
      sessionStorage.setItem('teewai_bachs', JSON.stringify({ checkout_id, plan, scans }));
      if (isNativeApp()) {
        window.open(checkout_url, '_blank');
        setProcessing(false);
        setWaitingForPayment(true);
      } else {
        window.location.href = checkout_url;
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Your payment didn't go through. No charge was made — try again, or use Paystack.");
      setProcessing(false);
    }
  };

  // Manual "I've completed payment" button — user taps this after returning.
  const checkPaymentManually = async () => {
    const storedBachs = JSON.parse(sessionStorage.getItem('teewai_bachs') || '{}');
    if (storedBachs.checkout_id) {
      setVerifying(true);
      const res = await verifyAndActivateBachs(storedBachs.checkout_id, storedBachs.plan);
      setVerifying(false);
      if (res.ok) {
        sessionStorage.removeItem('teewai_bachs');
        setWaitingForPayment(false);
        navigate('/thank-you', { state: { plan: res.plan, scans: res.scans, reference: res.reference }, replace: true });
      } else {
        setError(res.error || 'Payment not confirmed yet. Make sure you completed it in the browser.');
      }
      return;
    }
    const stored = JSON.parse(sessionStorage.getItem('teewai_pay') || '{}');
    if (!stored.reference) return;
    setVerifying(true);
    const res = await verifyAndActivate(stored.reference, stored.plan, earlyAdopter);
    setVerifying(false);
    if (res.ok) {
      sessionStorage.removeItem('teewai_pay');
      setWaitingForPayment(false);
      navigate('/thank-you', { state: { plan: res.plan, scans: res.scans, reference: res.reference }, replace: true });
    } else {
      setError(res.error || 'Payment not confirmed yet. Make sure you completed it in the browser.');
    }
  };

  const redeemFree = async () => {
    setRedeeming(true);
    setError('');
    try {
      const res = await freeActivate(plan, scans, coupon);
      setRedeeming(false);
      if (res.ok) navigate('/thank-you', { state: { plan: res.plan, scans: res.scans, reference: res.reference }, replace: true });
      else setError(res.error);
    } catch (e) {
      setRedeeming(false);
      setError(e?.message || "We couldn't redeem this coupon. It may be invalid or expired — try a different code.");
    }
  };

  const onPayClick = () => {
    if (isExcess) { setShowExcessConfirm(true); return; }
    if (isFree) { redeemFree(); return; }
    if (method === 'bachs') { startBachs(); return; }
    if (isNativeApp()) { startPaymentNative(); return; }
    startPayment(['card', 'bank_transfer', 'ussd', 'bank', 'qr', 'mobile_money']);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <BackButton fallback="/subscription" className="mb-4" />
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-olo" />
        </div>
        <h1 className="font-heading font-700 text-3xl tracking-tight mb-2">Confirm your order</h1>
        <p className="text-muted-foreground">Review your selection and pay securely.</p>
      </div>

      <div className="flex justify-center mb-6">
        <CurrencySwitcher />
      </div>

      {verifying && (
        <div className="mb-6 p-5 rounded-2xl border border-olo/30 bg-olo/5 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-olo animate-spin" />
          <p className="text-sm font-medium">Verifying your payment…</p>
        </div>
      )}

      {/* Order summary */}
      <div className="p-6 rounded-3xl border border-border bg-card mb-6">
        <h2 className="font-heading font-700 text-lg mb-4">Order summary</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading font-600">{PLAN_LABELS[plan] || plan}</p>
              <p className="text-xs text-muted-foreground">
                {isUnlimited ? 'Unlimited scans' : `${scansCount} scan${scansCount === 1 ? '' : 's'}`}
              </p>
            </div>
            <span className="font-heading font-700 text-lg">{format(priceUsd)}</span>
          </div>
          {coupon && (
            <div className="flex items-center justify-between text-olo">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium"><Tag className="w-4 h-4" /> {coupon.code}</span>
              <span className="text-sm font-semibold">−{format(discountUsd)}</span>
            </div>
          )}
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <span className="font-heading font-700">Total</span>
            <span className="font-heading font-800 text-2xl text-olo">{format(finalUsd)}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" /> <span className="min-w-0">{method === 'bachs' ? `Charged $${bachsUsd.toFixed(2)} in your local currency via Bachs.` : `Charged exactly ₦${chargeNgn.toLocaleString()} via Paystack.`}</span>
        </p>
        <p className="text-[11px] text-warning mt-2 flex items-start gap-1.5">
          <ArrowLeftRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span className="min-w-0">{method === 'bachs' ? 'Converted at live rates, settled in USD.' : 'Settled in Naira. Other currencies are display-only.'}</span>
        </p>
      </div>

      {/* Expiry notice for scan packs */}
      {(() => {
        const expiryDays = PACK_EXPIRY_DAYS[plan] || (plan === 'custom' ? 30 : 0);
        if (!expiryDays) return null;
        const expiryDate = new Date(Date.now() + expiryDays * 86400000);
        return (
          <div className="mb-6 p-4 rounded-2xl border border-warning/20 bg-warning-soft flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning">{expiryDays === 1 ? 'Expires in 24 hours' : `Expires in ${expiryDays} days`}</p>
              <p className="text-muted-foreground mt-0.5">
                {PLAN_LABELS[plan] || plan} {expiryDays === 1 ? 'must be used within 24 hours of purchase' : `must be used within ${expiryDays} days of purchase`}. Use it before {expiryDate.toLocaleDateString()} or it will expire.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Payment method selector — always show both. Paystack (Naira) is
          recommended for Nigerian users; Bachs (local currency) for everyone else. */}
      {!isFree && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Pay with</p>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl border border-border bg-muted/40">
            <button
              type="button"
              onClick={() => setPayMethod('paystack')}
              className={`min-w-0 px-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${method === 'paystack' ? 'bg-olo text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="flex items-center justify-center gap-1.5 min-w-0"><CreditCard className="w-4 h-4 flex-shrink-0" /><span className="truncate">Paystack · ₦</span></span>
              <span className={`block text-[10px] font-normal truncate mt-0.5 ${method === 'paystack' ? 'text-white/75' : ''}`}>Naira cards & transfer</span>
            </button>
            <button
              type="button"
              disabled={!bachsAllowed}
              onClick={() => setPayMethod('bachs')}
              className={`min-w-0 px-2 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${method === 'bachs' ? 'bg-olo text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="flex items-center justify-center gap-1.5 min-w-0"><Globe className="w-4 h-4 flex-shrink-0" /><span className="truncate">Bachs · Global</span></span>
              <span className={`block text-[10px] font-normal truncate mt-0.5 ${method === 'bachs' ? 'text-white/75' : ''}`}>{bachsAllowed ? 'International cards' : 'Min. $1'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Pay / redeem buttons */}
      <div className="space-y-3">
        {isFree ? (
          <button
            onClick={onPayClick}
            disabled={redeeming || verifying}
            className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-6 py-4 rounded-2xl hover:scale-[1.02] transition-transform olo-glow disabled:opacity-60 disabled:hover:scale-100"
          >
            {redeeming ? <><Loader2 className="w-5 h-5 animate-spin" /> Redeeming…</> : <><Tag className="w-5 h-5" /> Redeem for free</>}
          </button>
        ) : (
          <>
            <button
              onClick={onPayClick}
              disabled={processing || verifying}
              className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-6 py-4 rounded-2xl hover:scale-[1.02] transition-transform olo-glow disabled:opacity-60 disabled:hover:scale-100"
            >
              {processing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</> : <><CreditCard className="w-5 h-5" /> Pay {format(method === 'bachs' ? bachsUsd : finalUsd)}</>}
            </button>
            {applePay && method === 'paystack' && (
              <button
                onClick={() => startPayment(['apple_pay'])}
                disabled={processing || verifying}
                className="w-full inline-flex items-center justify-center gap-2 bg-black text-white font-semibold px-6 py-4 rounded-2xl hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:hover:scale-100"
              >
                <ApplePayMark className="w-4 h-4" /> {processing ? 'Processing…' : 'Apple Pay'}
              </button>
            )}
          </>
        )}
      </div>

      {!isFree && method === 'paystack' && (
        <div className="mt-4">
          <PaystackTrustNote />
        </div>
      )}

      {waitingForPayment && (
        <div className="mb-6 p-6 rounded-3xl border border-olo/30 bg-olo/5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-6 h-6 text-olo" />
          </div>
          <h3 className="font-heading font-700 text-lg mb-2">Complete your payment in the browser</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We've opened your phone's browser with the secure payment page. Once you've paid, come back to teewai and tap below.
          </p>
          <button
            onClick={checkPaymentManually}
            disabled={verifying}
            className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-6 py-3.5 rounded-2xl hover:scale-[1.02] transition-transform olo-glow disabled:opacity-60"
          >
            {verifying ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying…</> : <><CheckCircle className="w-5 h-5" /> I've completed payment</>}
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('teewai_pay'); setWaitingForPayment(false); }}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel payment
          </button>
        </div>
      )}

      {showExcessConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 animate-fade-up">
          <div className="max-w-sm w-full p-6 rounded-3xl bg-card border border-border shadow-2xl">
            <h3 className="font-heading font-700 text-lg mb-2">Coupon exceeds the pack</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Your coupon is worth more than this pack. The pack becomes free and the excess is forfeited — you won't be able to use the leftover on a future purchase.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowExcessConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => { setShowExcessConfirm(false); redeemFree(); }} className="flex-1 px-4 py-2.5 rounded-xl bg-olo text-white font-semibold hover:scale-[1.02] transition-transform">Continue</button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-2xl border border-danger/30 bg-danger-soft flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-caption font-heading font-600 text-danger mb-0.5">Payment couldn't be completed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <button onClick={() => navigate('/subscription')} className="text-sm text-muted-foreground hover:text-foreground">← Back to plans</button>
      </div>
    </div>
  );
}