import { useState, useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { Crown, Loader2, HeartPulse, Gauge } from 'lucide-react';

export default function FamilyHealthRanking({ members: propMembers }) {
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const payload = propMembers ? { op: 'health', members: propMembers } : { op: 'health' };
    unrufld.functions.invoke('familyResolve', payload)
      .then(({ data }) => { if (data?.ranking) setRanking(data.ranking); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propMembers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!ranking || !ranking.length) {
    return (
      <div className="p-5 rounded-2xl border border-border bg-card text-center">
        <p className="text-sm text-muted-foreground">No family scans yet. Start scanning to see your family ranking!</p>
      </div>
    );
  }

  const ranked = ranking.filter((r) => r.healthScore != null);
  const unranked = ranking.filter((r) => r.healthScore == null);
  const avgHealth = ranked.length ? Math.round(ranked.reduce((a, r) => a + r.healthScore, 0) / ranked.length) : null;
  const avgWhiteness = ranked.length ? Math.round(ranked.reduce((a, r) => a + (r.whitenessScore || 0), 0) / ranked.length) : null;

  return (
    <div className="space-y-4">
      {/* Family averages */}
      {avgHealth != null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl border border-border bg-card text-center">
            <HeartPulse className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Family health</p>
            <p className="text-2xl font-heading font-700 text-emerald-500">{avgHealth}</p>
          </div>
          <div className="p-4 rounded-2xl border border-border bg-card text-center">
            <Gauge className="w-5 h-5 text-olo mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Family whiteness</p>
            <p className="text-2xl font-heading font-700 text-olo">{avgWhiteness ?? '—'}</p>
          </div>
        </div>
      )}

      {/* Ranking list */}
      <div className="space-y-2">
        {ranked.map((r, i) => (
          <div key={i} className={`flex items-center gap-3 p-4 rounded-2xl border ${i === 0 ? 'border-olo/40 bg-olo/5' : 'border-border bg-card'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-heading font-700 text-sm flex-shrink-0 ${i === 0 ? 'bg-olo text-white' : 'bg-muted text-muted-foreground'}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{r.name}</p>
              {r.role && <p className="text-xs text-muted-foreground capitalize">{r.role}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-heading font-700 text-lg text-olo">{r.healthScore}</p>
              <p className="text-[10px] text-muted-foreground">{r.scanCount} scan{r.scanCount !== 1 ? 's' : ''}</p>
            </div>
            {i === 0 && <Crown className="w-4 h-4 text-olo flex-shrink-0" />}
          </div>
        ))}
        {unranked.map((r, i) => (
          <div key={`u${i}`} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card opacity-60">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground flex-shrink-0">—</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{r.name}</p>
              {r.role && <p className="text-xs text-muted-foreground capitalize">{r.role}</p>}
            </div>
            <p className="text-xs text-muted-foreground flex-shrink-0">No scans yet</p>
          </div>
        ))}
      </div>
    </div>
  );
}