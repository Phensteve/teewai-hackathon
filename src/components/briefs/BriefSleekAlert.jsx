import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shouldShowBriefAlert, markBriefAlertShown, getActiveMonthlyKey, getActiveYearlyKey } from '@/lib/briefData';
import { toast } from '@/components/ui/use-toast';

// Monthly & yearly briefs don't get a popup. Instead they fire a sleek,
// one-shot toast: "Your August brief is ready." with a tap action straight
// to the Briefs page. The persistent badge/dot on the Brief entry stays
// until the user actually opens the brief (markBriefRead on the Briefs page).
//
// One-shot guarantee: markBriefAlertShown writes ALERT_KEY (keyed by period)
// to localStorage the moment the toast is queued. shouldShowBriefAlert
// returns false on every later login for the same period, so a dismissed
// or ignored alert never repeats. Cross-device: the read state is mirrored
// to the user profile (syncBriefReadStates), so once read on one device the
// badge clears everywhere.
export default function BriefSleekAlert() {
  const navigate = useNavigate();

  useEffect(() => {
    const check = () => {
      const now = new Date();
      for (const type of ['monthly', 'yearly']) {
        if (!shouldShowBriefAlert(type)) continue;
        markBriefAlertShown(type);
        const key = type === 'monthly' ? getActiveMonthlyKey(now) : getActiveYearlyKey(now);
        const periodName = type === 'monthly'
          ? new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: 'long' })
          : key;
        toast({
          title: `Your ${periodName} brief is ready.`,
          description: 'Tap to read it.',
          duration: 7000,
          action: (
            <button
              onClick={() => navigate('/briefs')}
              className="inline-flex items-center gap-1 bg-olo text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Read
            </button>
          ),
        });
      }
    };
    // Small delay so it doesn't fight with the daily/weekly popup for attention
    const t = setTimeout(check, 2000);
    return () => clearTimeout(t);
  }, [navigate]);

  return null;
}