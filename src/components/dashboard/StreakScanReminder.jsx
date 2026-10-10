import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Camera, X } from 'lucide-react';

// 24-hour streak-decay nudge — fires in-app (with a haptic pulse) when the user
// opens the dashboard and 24h+ have passed since their last scan. Complements
// the background dailyScanReminder (email + push, which vibrates the phone via
// the OS notification channel) by catching users who DO open the app but haven't
// scanned yet today. Shows at most once per UTC day.
//
// Progressive nudge timeline (no guilt, clinical-luxury tone):
//   24–48h → this gentle reminder + haptic
//   48–72h → StreakShieldRescue (auto-deploys a shield)

const SPRING = { type: 'spring', stiffness: 380, damping: 34 };

export default function StreakScanReminder({ latest, streak }) {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!latest || streak <= 0) return;
    const hoursSince = (Date.now() - new Date(latest.created_date).getTime()) / 3600000;
    // Only the 24–48h window — the shield rescue owns 48–72h.
    if (hoursSince < 24 || hoursSince >= 48) return;
    // At most once per UTC day.
    const d = new Date();
    const dayKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    try { if (localStorage.getItem(`teewai_scan_reminder_${dayKey}`) === '1') return; } catch {}
    setShow(true);
    try { localStorage.setItem(`teewai_scan_reminder_${dayKey}`, '1'); } catch {}
    // Haptic pulse — a distinct double-tap so it reads as a nudge, not an error.
    // navigator.vibrate is supported in Android WebView; no-op on iOS.
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([40, 60, 40]); } catch {}
    }
  }, [latest, streak]);

  const dismiss = () => setShow(false);
  const scanNow = () => { setShow(false); navigate('/scan'); };

  const hoursSince = latest ? Math.floor((Date.now() - new Date(latest.created_date).getTime()) / 3600000) : 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={SPRING}
          className="relative p-5 rounded-3xl border border-warning/30 bg-warning-soft frost-edge overflow-hidden"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center flex-shrink-0">
                <Flame className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-heading font-600 text-base">Your streak needs you</h3>
                <p className="text-xs text-muted-foreground">{streak}-day streak · {hoursSince}h since your last scan</p>
              </div>
            </div>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            One quick scan today keeps your streak alive. Don't let {streak} days of momentum fade — it only takes 90 seconds.
          </p>
          <div className="flex gap-2.5">
            <button onClick={scanNow} className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-xl text-sm hover:scale-[1.02] transition-transform olo-glow">
              <Camera className="w-4 h-4" /> Scan now
            </button>
            <button onClick={dismiss} className="inline-flex items-center justify-center gap-1.5 border border-border text-muted-foreground font-medium px-4 py-3 rounded-xl text-sm hover:bg-muted/50 transition-colors">
              Later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}