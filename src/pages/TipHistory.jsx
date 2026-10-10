import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TipCard from '@/components/dashboard/TipCard';
import SkeletonBlock from '@/components/loading/SkeletonBlock';
import { useTips } from '@/hooks/use-tips';

// Browsable library of every active dental tip, rendered as accordions
// (minimized by default, expand on click) — the same TipCard used on the
// dashboard. Tips come from the admin-managed Tip entity so the list always
// matches what admins manage.
export default function TipHistory() {
  const tipsQuery = useTips();
  const tips = tipsQuery.data || [];
  const [expandedId, setExpandedId] = useState(null);

  const toggle = useCallback((id) => setExpandedId((p) => (p === id ? null : id)), []);

  const info = tips.filter((t) => t.category === 'info');
  const lifestyle = tips.filter((t) => t.category === 'lifestyle');
  // Von Restorff isolate: the first admin-verified tip in each group stands
  // out from the uniform list so the most trustworthy tip is immediately findable.
  const firstVerifiedInfo = info.find((t) => t.verified)?.id;
  const firstVerifiedLifestyle = lifestyle.find((t) => t.verified)?.id;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <h1 className="font-heading font-700 text-2xl mb-1">Dental tips</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Every tip in the teewai library. Tap any card to read the full explanation.
      </p>

      {tipsQuery.isLoading ? (
        <div role="status" aria-label="Loading tips"><SkeletonBlock type="rows" count={6} /></div>
      ) : tips.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">No tips available yet.</p>
      ) : (
        <div className="space-y-6">
          {info.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Dental knowledge
              </p>
              <div className="space-y-2.5">
                {info.map((tip) => (
                  <TipCard
                    key={tip.id}
                    tip={tip}
                    expanded={expandedId === tip.id}
                    onToggle={() => toggle(tip.id)}
                    isolate={tip.id === firstVerifiedInfo}
                  />
                ))}
              </div>
            </div>
          )}
          {lifestyle.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Daily habits
              </p>
              <div className="space-y-2.5">
                {lifestyle.map((tip) => (
                  <TipCard
                    key={tip.id}
                    tip={tip}
                    expanded={expandedId === tip.id}
                    onToggle={() => toggle(tip.id)}
                    isolate={tip.id === firstVerifiedLifestyle}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}