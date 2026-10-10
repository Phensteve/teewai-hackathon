import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gem, ArrowRight, Lock } from 'lucide-react';
import { userProgress } from '@/lib/insforgeDb';
import { collectionStats, DISCOVERY_CHARMS, RARITY_META } from '@/lib/discoveries';

// Dashboard summary for the Collection Cabinet — an expandable section on
// the Overview tab showing total charms, traits, badges, per-rarity
// completion, and the 3 most recent finds, linking to the full /collection page.
export default function CollectionSummary() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    userProgress.filter({})
      .then((list) => { if (alive) setProgress(list?.[0] || null); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const stats = collectionStats(progress);
  const recent = (stats.recentCharms || []).map((id) => DISCOVERY_CHARMS.find((c) => c.id === id)).filter(Boolean);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl border border-border bg-card/50 text-center text-sm text-muted-foreground">
        Loading your collection…
      </div>
    );
  }

  const totalCompletion = Math.round(
    ((stats.charms.count + stats.traits.count) / (stats.charms.total + stats.traits.total)) * 100
  ) || 0;

  return (
    <div className="space-y-3">
      <Link
        to="/collection"
        className="flex items-center gap-3 p-4 rounded-2xl border border-olo/30 bg-olo/5 hover:bg-olo/10 transition-colors group"
      >
        <span className="icon-primary olo-glow"><Gem /></span>
        <div className="flex-1">
          <p className="text-caption font-heading font-600">Collection Cabinet</p>
          <p className="text-caption text-muted-foreground">
            {stats.charms.count} charms · {stats.traits.count} traits · {stats.milestones} badges · {totalCompletion}% complete
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-olo group-hover:translate-x-1 transition-transform" />
      </Link>

      {/* Per-rarity completion bars */}
      <div className="p-4 rounded-2xl border border-border bg-card">
        <p className="text-label text-muted-foreground mb-3">Completion by rarity</p>
        <div className="space-y-2.5">
          {['uncommon', 'rare', 'epic', 'legendary'].map((r) => {
            const charmR = stats.charms.byRarity[r];
            const traitR = stats.traits.byRarity[r];
            const have = (charmR?.have || 0) + (traitR?.have || 0);
            const total = (charmR?.total || 0) + (traitR?.total || 0);
            const pct = total ? Math.round((have / total) * 100) : 0;
            const meta = RARITY_META[r];
            return (
              <div key={r} className="flex items-center gap-3">
                <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: meta.color }}>
                  {meta.icon} {meta.label}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-premium"
                    style={{ width: `${pct}%`, backgroundColor: meta.color }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-10 text-right flex-shrink-0">{have}/{total}</span>
              </div>
            );
          })}
        </div>
        {stats.discoveryXp > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            <span className="text-olo font-semibold">{stats.discoveryXp} XP</span> earned from discoveries
          </p>
        )}
      </div>

      {/* Recent finds */}
      {recent.length > 0 ? (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-label text-muted-foreground mb-3">Recent finds</p>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {recent.map((c) => (
              <div
                key={c.id}
                className="flex-shrink-0 w-20 p-2.5 rounded-2xl text-center"
                style={{ background: `${RARITY_META[c.rarity].color}1a`, boxShadow: `inset 0 0 0 1px ${RARITY_META[c.rarity].color}40` }}
                title={`${c.label} — ${c.desc}`}
              >
                <div className="text-2xl mb-1">{c.icon}</div>
                <p className="text-[10px] font-semibold truncate" style={{ color: RARITY_META[c.rarity].color }}>{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl border border-dashed border-border bg-card/50 text-center">
          <Lock className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Scan a food, log a new drink, or harvest a bloom to find your first charm.</p>
        </div>
      )}
    </div>
  );
}