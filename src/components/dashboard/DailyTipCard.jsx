import { useState, useEffect } from 'react';
import { Brush, X, ChevronRight } from 'lucide-react';
import { getTodayKey } from '@/lib/dailyTips';

// Reusable daily tip card. Shows a tip, dismisses to a slim chip that
// reopens it. Dismissal is per-day per-tip so a new tip appears each day
// regardless of whether the previous day was dismissed.
const STORAGE_KEY = (userId, tipId) =>
  `teewai_tip_${userId || 'anon'}_${tipId}_${getTodayKey()}`;

const violet = 'border-violet-400/40 bg-violet-50/80 dark:bg-violet-950/30';
const olo = 'border-olo/25 bg-olo/5';

export default function DailyTipCard({ tip, userId, onMore, accent = 'olo', icon: Icon = Brush }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!tip) return;
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY(userId, tip.id)) === '1');
    } catch {}
  }, [userId, tip?.id]);

  if (!tip) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY(userId, tip.id), '1'); } catch {}
  };
  const reopen = () => {
    setDismissed(false);
    try { localStorage.removeItem(STORAGE_KEY(userId, tip.id)); } catch {}
  };

  if (dismissed) return null;

  return (
    <div className={`mb-4 p-4 rounded-2xl border transition-colors ${accent === 'violet' ? violet : olo}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          accent === 'violet' ? 'bg-violet-500/15' : 'bg-olo/10'
        }`}>
          <Icon className={`w-4 h-4 ${accent === 'violet' ? 'text-violet-600 dark:text-violet-400' : 'text-olo'}`} />
        </div>
        <div className="flex-1">
          <p className={`text-sm font-heading font-600 ${accent === 'violet' ? 'text-violet-900 dark:text-violet-200' : 'text-foreground'}`}>
            {tip.title}
          </p>
          <p className={`text-xs mt-1 leading-relaxed ${accent === 'violet' ? 'text-violet-700/80 dark:text-violet-300/70' : 'text-muted-foreground'}`}>
            {tip.body}
          </p>
          {onMore && (
            <button
              onClick={onMore}
              className={`inline-flex items-center gap-1 text-xs font-semibold mt-3 ${accent === 'violet' ? 'text-violet-700 dark:text-violet-300' : 'text-olo'} hover:underline`}
            >
              More <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
            accent === 'violet' ? 'hover:bg-violet-200/50 dark:hover:bg-violet-800/30' : 'hover:bg-muted'
          }`}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}