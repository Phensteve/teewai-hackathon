import { useState, useEffect } from 'react';
import { Brush, X, ChevronRight } from 'lucide-react';
import PurpleStripExplainer from './PurpleStripExplainer';

// Dashboard tip card: the first thing every new user sees. Pinned at the
// VERY TOP of the dashboard, above every other card. Explains the purple
// strip trick in the de-AI voice. Dismissible, collapses to a slim chip that
// reopens it. Dismissal persists per account (localStorage keyed by user ID).
// When the user's latest scan is flagged, the card highlights with the
// specific detection message.

const STORAGE_KEY = (userId) => `teewai_purple_tip_dismissed_${userId || 'anon'}`;

export default function PurpleStripTipCard({ userId, latestScanFlagged }) {
  const [dismissed, setDismissed] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY(userId)) === '1');
    } catch {}
  }, [userId]);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY(userId), '1');
    } catch {}
  };

  const reopen = () => {
    setDismissed(false);
    try {
      localStorage.removeItem(STORAGE_KEY(userId));
    } catch {}
  };

  // Collapsed chip state
  if (dismissed) {
    return (
      <>
        <button
          onClick={reopen}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors mb-4 ${
            latestScanFlagged
              ? 'border-violet-400/50 bg-violet-50/80 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
              : 'border-border bg-card text-muted-foreground hover:border-olo/40 hover:text-olo'
          }`}
        >
          <Brush className={`w-3.5 h-3.5 ${latestScanFlagged ? 'text-violet-500' : 'text-olo'}`} />
          <span className="flex-1 text-left">
            {latestScanFlagged
              ? 'We detected a color correcting product in your latest scan'
              : 'The purple strip trick, explained'}
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <PurpleStripExplainer open={explainerOpen} onClose={() => setExplainerOpen(false)} />
      </>
    );
  }

  // Expanded card state
  return (
    <>
      <div className={`mb-4 p-4 rounded-2xl border transition-colors ${
        latestScanFlagged
          ? 'border-violet-400/40 bg-violet-50/80 dark:bg-violet-950/30'
          : 'border-olo/25 bg-olo/5'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            latestScanFlagged ? 'bg-violet-500/15' : 'bg-olo/10'
          }`}>
            <Brush className={`w-4 h-4 ${latestScanFlagged ? 'text-violet-600 dark:text-violet-400' : 'text-olo'}`} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-heading font-600 ${latestScanFlagged ? 'text-violet-900 dark:text-violet-200' : 'text-foreground'}`}>
              {latestScanFlagged
                ? 'We detected a color correcting product in your latest scan'
                : 'The purple strip trick'}
            </p>
            <p className={`text-xs mt-1 leading-relaxed ${latestScanFlagged ? 'text-violet-700/80 dark:text-violet-300/70' : 'text-muted-foreground'}`}>
              {latestScanFlagged
                ? 'Purple strips and serums paint your teeth, they don\'t whiten them. The violet film cancels yellow optically. Your shade reading is distorted, so we excluded this scan from your progress. Re-scan without the product for your true shade.'
                : 'Purple strips and serums don\'t whiten, they paint.'}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setExplainerOpen(true)}
                className={`inline-flex items-center gap-1 text-xs font-semibold ${latestScanFlagged ? 'text-violet-700 dark:text-violet-300' : 'text-olo'} hover:underline`}
              >
                More <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              latestScanFlagged ? 'hover:bg-violet-200/50 dark:hover:bg-violet-800/30' : 'hover:bg-muted'
            }`}
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
      <PurpleStripExplainer open={explainerOpen} onClose={() => setExplainerOpen(false)} />
    </>
  );
}