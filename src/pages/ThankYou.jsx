import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { subscriptions } from '@/lib/insforgeDb';
import { unrufld } from '@/api/unrufldClient';
import { Camera, Home, ArrowRight, PartyPopper } from 'lucide-react';
import { PLAN_LABELS, SCANS_FOR } from '@/lib/payment';
import PaystackTrustNote from '@/components/PaystackTrustNote';

export default function ThankYou() {
  const navigate = useNavigate();
  const location = useLocation();
  const { plan, scans, reference, fromApp } = location.state || {};
  const [sub, setSub] = useState(null);

  useEffect(() => {
    // Funnel analytics: checkout complete — the conversion event for the
    // paywall→checkout→complete funnel. audit item N.
    if (plan) unrufld.analytics.track({ eventName: 'checkout_complete', properties: { plan, scans: plan === 'custom' ? scans : SCANS_FOR(plan), reference } });
    (async () => {
      try {
        const existing = await subscriptions.filter({});
        if (existing[0]) setSub(existing[0]);
      } catch {}
    })();
  }, []);

  const isUnlimited = plan === 'pro' || plan === 'pro_yearly' || plan === 'pro_weekly';
  const scansCount = plan === 'custom' ? scans : SCANS_FOR(plan);
  const scansLeft = sub ? Math.max(0, (sub.scans_limit || 0) - (sub.scans_used || 0)) : null;

  return (
    <div className="max-w-xl mx-auto text-center py-8">
      <div className="w-20 h-20 rounded-3xl bg-olo/10 flex items-center justify-center mx-auto mb-6 animate-fade-up">
        <PartyPopper className="w-10 h-10 text-olo" />
      </div>
      <h1 className="font-heading font-700 text-3xl tracking-tight mb-2">Thank you! 🎉</h1>
      <p className="text-muted-foreground mb-6">Your purchase was successful and your scans are ready to use.</p>

      <div className="p-6 rounded-3xl border border-border bg-card text-left mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Plan</p>
            <p className="font-heading font-700 text-lg">{PLAN_LABELS[plan] || plan || 'Your plan'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{isUnlimited ? 'Access' : 'Scans added'}</p>
            <p className="font-heading font-700 text-lg text-olo">{isUnlimited ? 'Unlimited' : `+${scansCount || 0}`}</p>
          </div>
        </div>
        {reference && <p className="text-xs text-muted-foreground font-mono break-all">Ref: {reference}</p>}
        {scansLeft != null && !isUnlimited && (
          <p className="text-sm text-muted-foreground mt-2">You now have <strong className="text-foreground">{scansLeft}</strong> scans available.</p>
        )}
        <div className="mt-4 pt-4 border-t border-border">
          <PaystackTrustNote />
        </div>
      </div>

      {fromApp ? (
        <div className="p-6 rounded-3xl border border-olo/30 bg-olo/5">
          <p className="font-heading font-600 text-lg text-olo mb-2">✅ Payment confirmed!</p>
          <p className="text-sm text-muted-foreground">You can close this page and return to the teewai app. Your scans are ready and waiting for you.</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate('/scan')} className="inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-6 py-3.5 rounded-2xl hover:scale-105 transition-transform olo-glow">
            <Camera className="w-5 h-5" /> Scan your teeth <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/dashboard')} className="inline-flex items-center justify-center gap-2 border border-border bg-card px-6 py-3.5 rounded-2xl hover:bg-muted transition-colors font-medium">
            <Home className="w-5 h-5" /> Go to dashboard
          </button>
        </div>
      )}
    </div>
  );
}