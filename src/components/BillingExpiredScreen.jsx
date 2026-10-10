import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, CalendarX, ArrowRight, X } from 'lucide-react';
import { isBillingExpired } from '@/lib/referral';
import { subscriptions } from '@/lib/insforgeDb';
import { PLAN_LABELS } from '@/lib/payment';

// Spotify-style full-screen overlay shown when the user logs in and their
// unlimited plan has expired (renewal_date in the past). Dismissible for the
// session — shows again on next login.
const SESSION_KEY = 'teewai_billing_expired_dismissed';

export default function BillingExpiredScreen() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const subs = await subscriptions.filter({});
        const sub = subs[0];
        if (!active) return;
        if (!sub || !isBillingExpired(sub)) return;
        setSubscription(sub);
        // Only show once per session.
        try {
          if (sessionStorage.getItem(SESSION_KEY) === '1') return;
        } catch {}
        setShow(true);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
    setShow(false);
  };

  const renew = () => {
    dismiss();
    navigate('/subscription');
  };

  const expiredDate = subscription?.renewal_date
    ? new Date(subscription.renewal_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'recently';

  const planLabel = subscription ? (PLAN_LABELS[subscription.plan] || subscription.plan) : 'Unlimited';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-olo-deep"
        >
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-olo/15 rounded-full blur-[100px]" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-olo/10 rounded-full blur-[100px]" />

          <button
            onClick={dismiss}
            className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 w-10 h-10 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-md mx-auto px-6 text-center"
          >
            {/* Icon */}
            <div className="w-20 h-20 rounded-3xl bg-olo/15 flex items-center justify-center mx-auto mb-6 olo-glow">
              <CalendarX className="w-10 h-10 text-olo" />
            </div>

            {/* Heading */}
            <p className="text-label text-olo/70 mb-2">Subscription expired</p>
            <h1 className="font-heading font-700 text-3xl text-white mb-3 tracking-tight">
              Your {planLabel} plan has expired
            </h1>
            <p className="text-body text-white/60 mb-8 max-w-sm mx-auto">
              Your plan ended on {expiredDate}. Renew now to restore your unlimited scans,
              referral rewards, and all teewai features.
            </p>

            {/* CTA */}
            <button
              onClick={renew}
              className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3.5 rounded-2xl hover:scale-[1.02] transition-transform olo-glow mb-3"
            >
              <Crown className="w-5 h-5" /> Renew now <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={dismiss}
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}