import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, X, Zap } from 'lucide-react';

// Active Save — the Subway Surfers "hoverboard" mechanic for streaks.
// Instead of passively auto-protecting (which the JCR study found *reduces*
// motivation to maintain streaks) or guilt-tripping the user (Duolingo's
// "you made Duo sad" dark pattern), this surfaces a time-limited deployment
// prompt that converts the loss-aversion moment into empowered action.
//
// Shows when: streak >= 3 and the user hasn't scanned today (daysSinceScan >= 1).
// The countdown is to UTC midnight — the same boundary the streak engine uses.

function useUtcCountdown() {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      setRemaining(midnight - now.getTime());
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return remaining;
}

export default function StainShieldPrompt({ streak, daysSinceScan, shields }) {
  const [dismissed, setDismissed] = useState(false);
  const ms = useUtcCountdown();
  if (dismissed) return null;

  const atRisk = streak >= 3 && daysSinceScan >= 1;
  if (!atRisk) return null;

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const hasShields = shields > 0;

  return (
    <div className="relative p-4 rounded-2xl border border-olo/30 bg-gradient-to-br from-olo/8 to-card overflow-hidden">
      {/* Subtle pulsing urgency ring */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-olo/10 rounded-full blur-2xl animate-pulse-glow pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-heading font-600 text-sm">Quick Save available</h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-olo/15 text-olo text-[10px] font-semibold tabular-nums">
              {hours}h {minutes}m left
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your <span className="text-olo font-semibold">{streak}-day streak</span> needs a scan today.
            {hasShields
              ? ` You have ${shields} shield${shields !== 1 ? 's' : ''} — but deploying one manually keeps your momentum active.`
              : ' No auto-shields left — scan now to keep it alive.'}
          </p>
          <Link
            to="/scan"
            className="mt-3 inline-flex items-center gap-1.5 bg-olo text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform olo-glow"
          >
            <Zap className="w-4 h-4" /> Deploy shield
          </Link>
        </div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}