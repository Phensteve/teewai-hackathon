import { Shield, AlertTriangle, Zap } from 'lucide-react';

// Streak-shield status — loss-aversion power-up status.
// Shows shield count and a decay warning when the streak is at risk.
export default function StreakShieldStatus({ streak, shields, daysSinceScan }) {
  const atRisk = daysSinceScan >= 1 && streak >= 3;

  return (
    <div className="p-4 rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-olo" />
          <h4 className="font-heading font-600 text-sm">Streak shields</h4>
        </div>
        <span className="text-xs font-semibold text-olo">{shields ?? 0} × 🛡️</span>
      </div>

      {atRisk ? (
        <div className="flex items-start gap-2 mt-2">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-warning font-medium">Decay warning</p>
            <p className="text-muted-foreground">
              Your {streak}-day streak needs a scan today. {shields ? 'A shield will auto-protect one missed day.' : 'No shields left — scan now to keep it alive.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 mt-2">
          <Zap className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {shields ? 'A shield auto-protects your streak if you miss a day. Scan daily to keep building.' : 'Earn shields by hitting milestones to protect your streak.'}
          </p>
        </div>
      )}
    </div>
  );
}