import { Crown } from 'lucide-react';
import RareColorBadge from '@/components/RareColorBadge';

const GOAL_LABELS = {
  whiten: 'a whiter smile',
  healthier_gums: 'healthier gums',
  track_progress: 'tracking progress',
  curiosity: 'exploring teewai',
};

export default function DashboardHeader({ me, isPro, subscriptionReady = true }) {
  const name = me?.username || me?.display_name || (me?.email ? me.email.split('@')[0] : '') || 'there';
  // Scale the greeting down for long usernames so the full name fits on one
  // line instead of truncating. text-h1 up to ~14 chars, then progressively
  // smaller; truncate remains a last-resort safety net for extreme lengths.
  const nameLen = name.length;
  const greetingCls =
    nameLen <= 12 ? 'text-h1'
    : nameLen <= 14 ? 'text-h2'
    : nameLen <= 20 ? 'text-h3'
    : nameLen <= 28 ? 'text-h4'
    : 'text-h5';

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className={`${greetingCls} truncate min-w-0`}>
          Hi, {name}
        </h1>
        <div className="flex items-center gap-3 flex-shrink-0">
          <RareColorBadge />
          {subscriptionReady && !isPro && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('teewai-open-paywall'))}
              className="flex items-center gap-1.5 text-caption font-semibold text-olo hover:gap-2.5 transition-all whitespace-nowrap"
            >
              <Crown className="w-4 h-4" /> Upgrade
            </button>
          )}
        </div>
      </div>
      <p className="text-caption text-muted-foreground mt-2">
        {me?.smile_goal ? (
          <>
            Your goal: <span className="text-olo font-medium">{GOAL_LABELS[me.smile_goal] || 'a brighter smile'}</span> ·{' '}
          </>
        ) : null}
        Track your whitening progress
      </p>
    </div>
  );
}