import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, X, Camera } from 'lucide-react';
import { userProgress } from '@/lib/insforgeDb';
import { playMilestone } from '@/lib/sounds';

// Streak Shield Rescue — if no scan in 48–72h, auto-applies a shield with a
// "Shield Burned" honor animation on return + 1-tap Express Scan to resume.
//
// Uses UserProgress (streak_shields, last_scan_date). The shield is burned
// (decremented) once per gap — tracked via localStorage so the honor animation
// doesn't repeat on every dashboard load. No guilt — the framing is "we saved
// your streak", not "you missed a day".

const SPRING = { type: 'spring', stiffness: 380, damping: 34 };

export default function StreakShieldRescue() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [burned, setBurned] = useState(false);
  const [shieldsLeft, setShieldsLeft] = useState(null);
  const burnedRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await userProgress.filter({}).catch(() => []);
        const prog = list[0];
        if (!active || !prog) return;

        const shields = prog.streak_shields ?? 0;
        const lastScan = prog.last_scan_date;
        if (!lastScan || shields <= 0) return;

        const hoursSince = (Date.now() - new Date(lastScan).getTime()) / 3600000;
        // 48–72h gap — the rescue window
        if (hoursSince < 48 || hoursSince > 72) return;

        // Only burn once per this gap (keyed by the last_scan_date).
        const flagKey = `teewai_shield_burned_${lastScan}`;
        let alreadyBurned = false;
        try { alreadyBurned = localStorage.getItem(flagKey) === '1'; } catch {}
        if (alreadyBurned) return;

        // Burn the shield.
        burnedRef.current = true;
        try {
          await userProgress.update(prog.id, { streak_shields: Math.max(0, shields - 1) });
          localStorage.setItem(flagKey, '1');
        } catch {}
        if (!active) return;

        setShieldsLeft(Math.max(0, shields - 1));
        setBurned(true);
        playMilestone();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate([30, 40, 60]); } catch {}
        }
        setShow(true);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  const dismiss = () => setShow(false);
  const expressScan = () => {
    setShow(false);
    navigate('/scan');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={SPRING}
          className="relative p-5 sm:p-6 rounded-3xl border border-olo/30 bg-card frost-edge overflow-hidden"
        >
          <div className="absolute inset-0 radial-olo opacity-25 pointer-events-none" />
          {/* Honor ring */}
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ ...SPRING, opacity: { duration: 1 } }}
            className="absolute top-6 left-6 w-16 h-16 rounded-full border-2 border-olo/40 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-olo/15 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-olo" />
                </div>
                <div>
                  <h3 className="font-heading font-600 text-base">Streak Shield deployed</h3>
                  <p className="text-xs text-muted-foreground">We saved your streak while you were away.</p>
                </div>
              </div>
              <button onClick={dismiss} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Life got busy — that's okay. A Streak Shield auto-protected your progress so your momentum is intact. Pick up right where you left off.
            </p>

            {shieldsLeft != null && (
              <p className="text-xs text-muted-foreground mb-4">
                {shieldsLeft} shield{shieldsLeft !== 1 ? 's' : ''} remaining.
              </p>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={expressScan}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-xl text-sm hover:scale-[1.02] transition-transform olo-glow"
              >
                <Camera className="w-4 h-4" /> Express scan to resume
              </button>
              <button
                onClick={dismiss}
                className="inline-flex items-center justify-center gap-1.5 border border-border text-muted-foreground font-medium px-4 py-3 rounded-xl text-sm hover:bg-muted/50 transition-colors"
              >
                <Zap className="w-4 h-4" /> Later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}