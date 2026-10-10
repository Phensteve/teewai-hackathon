import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Camera, X } from 'lucide-react';

// Friendly streak-at-risk alert + daily reminder.
// Shows when the user hasn't scanned today — nudges them to keep the streak alive,
// with a quick-access button to jump straight into the next scan.
export default function StreakAlert({ streak, daysSinceScan }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const atRisk = streak > 0 && daysSinceScan >= 1;
  const dailyNudge = streak === 0 && daysSinceScan >= 1;
  if (!atRisk && !dailyNudge) return null;

  return (
    <div className="relative p-4 rounded-2xl border border-olo/30 bg-olo/5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
        <Flame className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-heading font-600 text-sm">
          {atRisk ? `Your ${streak}-day streak needs you today` : 'Time for your daily scan'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {atRisk
            ? "Don't lose your streak — one quick scan keeps it alive."
            : 'A daily scan keeps your smile (and your rank) on track.'}
        </p>
        <Link
          to="/scan"
          className="mt-2.5 inline-flex items-center gap-1.5 bg-olo text-white text-sm font-semibold px-4 py-2 rounded-xl hover:scale-105 transition-transform olo-glow"
        >
          <Camera className="w-4 h-4" /> Scan now
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}