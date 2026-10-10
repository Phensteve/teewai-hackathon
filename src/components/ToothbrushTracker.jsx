import { useState, useEffect } from 'react';
import { Brush, RotateCcw, AlertCircle, Check } from 'lucide-react';

// Toothbrush replacement tracker — dentists recommend replacing every 3
// months (90 days) or after illness. Stores the start date in localStorage
// and nudges the user when the cycle is up.
const STORAGE_KEY = 'teewai_toothbrush_start';
const CYCLE_DAYS = 90;

export default function ToothbrushTracker() {
  const [startDate, setStartDate] = useState(null);
  const [justReset, setJustReset] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setStartDate(stored);
    } else {
      const today = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, today);
      setStartDate(today);
    }
  }, []);

  if (!startDate) return null;

  const days = Math.floor((Date.now() - new Date(startDate)) / 86400000);
  const progress = Math.min(100, (days / CYCLE_DAYS) * 100);
  const daysLeft = Math.max(0, CYCLE_DAYS - days);
  const overdue = days >= CYCLE_DAYS;
  const dueSoon = days >= CYCLE_DAYS - 14 && !overdue;

  const handleReplace = () => {
    const today = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, today);
    setStartDate(today);
    setJustReset(true);
    setTimeout(() => setJustReset(false), 3000);
  };

  const accent = overdue ? 'bg-danger' : dueSoon ? 'bg-warning' : 'bg-olo';
  const ring = overdue ? 'border-danger/30 bg-danger/5' : dueSoon ? 'border-warning/30 bg-warning/5' : 'border-border bg-card';
  const statusLabel = overdue ? 'Replace now' : dueSoon ? 'Due soon' : 'Fresh';
  const statusColor = overdue ? 'text-danger' : dueSoon ? 'text-warning' : 'text-olo';

  return (
    <div className={`p-5 rounded-3xl border ${ring} frost-edge`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center flex-shrink-0 ${!overdue && !dueSoon ? 'olo-glow' : ''}`}>
          {overdue ? <AlertCircle className="w-5 h-5 text-white" /> : <Brush className="w-5 h-5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-600 text-sm">Toothbrush tracker</h3>
          <p className="text-xs text-muted-foreground">
            {overdue
              ? `It's been ${days} days — time for a fresh brush.`
              : dueSoon
              ? `Replace in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — bristles wear out at 3 months.`
              : `Day ${days} of ${CYCLE_DAYS} — your brush is still fresh.`}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor} bg-current/10 flex-shrink-0`}>
          {statusLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${accent}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-4">
        <span>Day 1</span>
        <span>{days} days used</span>
        <span>Day {CYCLE_DAYS}</span>
      </div>

      <button
        onClick={handleReplace}
        className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white text-sm font-semibold py-3 rounded-xl active:scale-95 transition-transform olo-glow"
      >
        {justReset ? <Check className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
        {justReset ? 'Fresh start — day 1!' : 'I changed my toothbrush'}
      </button>

      {overdue && (
        <p className="mt-3 text-xs text-danger text-center">
          Worn bristles can damage gums and miss plaque — replace yours today.
        </p>
      )}
    </div>
  );
}