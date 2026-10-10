// Care-action resurface nudge — Rodeo's "capture intent, resurface at the
// right moment" pattern. Looks at the user's most recent staining log
// (coffee/tea/wine/etc. with a positive stain_level). If it was logged within
// a recovery window and no protective action (brush/water) has been logged
// since, resurfaces it now with the recovery action to take. Self-contained:
// creates a protective StainLog on tap, then dismisses.
import { useState, useEffect } from 'react';
import { Droplet, Check, Coffee, X } from 'lucide-react';
import { stainLogs } from '@/lib/insforgeDb';
import { useToast } from '@/components/ui/use-toast';

const RECOVERY_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h after the staining drink
const STAIN_THRESHOLD = 20; // stain_level above this counts as a staining item

export default function StainRecoveryNudge() {
  const [nudge, setNudge] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    stainLogs.list('-created_date', 30).then((logs) => {
      if (!mounted || !logs || logs.length === 0) return;
      // Find the most recent staining item (positive stain_level, not protective).
      const staining = logs.find(
        (l) => (l.stain_level || 0) > STAIN_THRESHOLD && l.category !== 'protective'
      );
      if (!staining) return;
      const stainTime = new Date(staining.created_date || staining.log_date).getTime();
      const since = Date.now() - stainTime;
      if (since < 0 || since > RECOVERY_WINDOW_MS) return;
      // Has a protective action been logged after the staining item?
      const protective = logs.find(
        (l) => l.category === 'protective' && new Date(l.created_date || l.log_date).getTime() > stainTime
      );
      if (protective) return;
      if (mounted) setNudge({ name: staining.item_name, time: staining.created_date || staining.log_date });
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const logProtective = async (kind) => {
    try {
      await stainLogs.create({
        item_name: kind === 'brush' ? 'Brushed teeth' : 'Drank water',
        category: 'protective',
        stain_level: kind === 'brush' ? -30 : -15,
        log_date: new Date().toISOString().slice(0, 10),
        source: 'custom',
      });
    } catch {}
    toast({
      title: kind === 'brush' ? 'Brushed' : 'Water logged',
      description: kind === 'brush'
        ? 'Your shade estimate is restored to your last scan.'
        : 'A rinse can reduce the impact of your most recent stain.',
    });
    setNudge(null);
    setDismissed(true);
  };

  if (!nudge || dismissed) return null;

  const minsAgo = Math.round((Date.now() - new Date(nudge.time).getTime()) / 60000);
  const timeLabel = minsAgo < 60 ? `${minsAgo}m ago` : `${Math.round(minsAgo / 60)}h ago`;

  return (
    <div className="p-4 rounded-2xl border border-warning/30 bg-warning/5 flex items-start gap-3">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-warning/15 text-warning flex-shrink-0">
        <Coffee className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-caption font-heading font-600">Recover your shade</p>
        <p className="text-caption text-muted-foreground mt-0.5">
          You logged <span className="font-medium text-foreground">{nudge.name}</span> {timeLabel}. A quick rinse or brush now keeps the stain from setting.
        </p>
        <div className="flex gap-2 mt-2.5">
          <button
            onClick={() => logProtective('brush')}
            className="inline-flex items-center justify-center gap-1.5 bg-olo/10 border border-olo/20 text-olo text-xs font-semibold px-3 py-2 rounded-lg active:scale-95 transition-transform"
          >
            <Check className="w-3.5 h-3.5" /> I brushed
          </button>
          <button
            onClick={() => logProtective('water')}
            className="inline-flex items-center justify-center gap-1.5 bg-olo/10 border border-olo/20 text-olo text-xs font-semibold px-3 py-2 rounded-lg active:scale-95 transition-transform"
          >
            <Droplet className="w-3.5 h-3.5" /> I rinsed
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="inline-flex items-center justify-center gap-1 text-muted-foreground text-xs font-medium px-2 py-2 rounded-lg hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}