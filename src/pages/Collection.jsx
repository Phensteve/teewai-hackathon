import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Gem, Trophy } from 'lucide-react';
import { useUserProgress } from '@/hooks/use-user-progress';
import { collectionStats, DISCOVERY_CHARMS, RARITY_META } from '@/lib/discoveries';
import { SMILE_TRAITS } from '@/lib/smileTraits';
import PageSkeleton from '@/components/loading/PageSkeleton';

// The full Collection Cabinet — every charm (earned + locked silhouettes),
// every Smile Trait discovered (rarity, count, first-found date), all badges,
// and the olo seer charm, grouped by rarity with completion progress and a
// total discovery-XP stat.
const BADGES = [
  { id: 'first_scan', icon: '🎯', label: 'First Scan', rarity: 'common' },
  { id: 'scans3', icon: '🌱', label: 'Sprout', rarity: 'common' },
  { id: 'streak3', icon: '🔥', label: 'On Fire', rarity: 'rare' },
  { id: 'streak7', icon: '⚡', label: 'Week Warrior', rarity: 'rare' },
  { id: 'scans10', icon: '📸', label: 'Dedicated', rarity: 'rare' },
  { id: 'streak14', icon: '🔥', label: 'Fortnight Fire', rarity: 'epic' },
  { id: 'scans25', icon: '🏆', label: 'Smile Scholar', rarity: 'epic' },
  { id: 'streak30', icon: '💎', label: 'Unbreakable', rarity: 'legendary' },
  { id: 'scans50', icon: '👑', label: 'Smile Legend', rarity: 'legendary' },
];

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export default function Collection() {
  const progressQuery = useUserProgress();
  const progress = progressQuery.data || null;
  const loading = progressQuery.isPending;

  if (loading) return <PageSkeleton title="Collection Cabinet" />;

  const stats = collectionStats(progress);
  const earnedCharms = new Set(stats.charms.ids);
  const earnedTraits = new Map((stats.traits.collected || []).map((t) => [t.id, t]));

  const totalCompletion = Math.round(
    ((stats.charms.count + stats.traits.count) / (stats.charms.total + stats.traits.total)) * 100
  ) || 0;

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5">
        <ArrowRight className="w-4 h-4 rotate-180" /> Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
          <Gem className="w-6 h-6 text-olo" />
        </div>
        <div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">Collection Cabinet</h1>
          <p className="text-sm text-muted-foreground">Every charm, trait & badge you've discovered across teewai.</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="p-4 rounded-2xl border border-border bg-card frost-edge text-center">
          <p className="text-2xl font-heading font-700 text-olo tabular-nums">{stats.charms.count}</p>
          <p className="text-label text-muted-foreground mt-1">Charms</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card frost-edge text-center">
          <p className="text-2xl font-heading font-700 text-olo tabular-nums">{stats.traits.count}</p>
          <p className="text-label text-muted-foreground mt-1">Smile Traits</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card frost-edge text-center">
          <p className="text-2xl font-heading font-700 text-olo tabular-nums">{stats.discoveryXp}</p>
          <p className="text-label text-muted-foreground mt-1">Discovery XP</p>
        </div>
      </div>

      {/* Overall completion */}
      <div className="mt-4 p-5 rounded-3xl border border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall completion</span>
          <span className="font-heading font-700 text-lg text-olo tabular-nums">{totalCompletion}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-olo transition-all duration-700 ease-premium" style={{ width: `${totalCompletion}%` }} />
        </div>
      </div>

      {/* Charms by rarity */}
      <h2 className="font-heading font-600 text-lg mt-8 mb-3">Charms</h2>
      <div className="space-y-5">
        {RARITY_ORDER.map((r) => {
          const pool = DISCOVERY_CHARMS.filter((c) => c.rarity === r);
          if (!pool.length) return null;
          const meta = RARITY_META[r];
          const have = pool.filter((c) => earnedCharms.has(c.id)).length;
          return (
            <div key={r}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.icon} {meta.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{have}/{pool.length}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {pool.map((c) => {
                  const earned = earnedCharms.has(c.id);
                  return (
                    <div
                      key={c.id}
                      title={earned ? `${c.label} — ${c.desc}` : 'Locked'}
                      className={`relative p-3 rounded-2xl text-center ${earned ? '' : 'opacity-50'}`}
                      style={earned ? { background: `${meta.color}1a`, boxShadow: `inset 0 0 0 1px ${meta.color}40` } : { background: 'hsl(var(--muted) / 0.4)', boxShadow: 'inset 0 0 0 1px hsl(var(--border))' }}
                    >
                      <div className={`text-3xl mb-1.5 ${earned ? '' : 'grayscale'}`}>{earned ? c.icon : '🔒'}</div>
                      <p className={`text-[11px] font-semibold truncate ${earned ? '' : 'text-muted-foreground'}`} style={earned ? { color: meta.color } : {}}>
                        {c.label}
                      </p>
                      {earned && <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{c.desc}</p>}
                      {!earned && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-muted-foreground" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Smile Traits */}
      <h2 className="font-heading font-600 text-lg mt-8 mb-3">Smile Traits</h2>
      <div className="space-y-5">
        {RARITY_ORDER.map((r) => {
          const pool = SMILE_TRAITS.filter((t) => t.rarity === r);
          if (!pool.length) return null;
          const meta = RARITY_META[r];
          const have = pool.filter((t) => earnedTraits.has(t.id)).length;
          return (
            <div key={r}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.icon} {meta.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{have}/{pool.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pool.map((t) => {
                  const rec = earnedTraits.get(t.id);
                  const earned = !!rec;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl ${earned ? '' : 'opacity-50'}`}
                      style={earned ? { background: `${meta.color}1a`, boxShadow: `inset 0 0 0 1px ${meta.color}40` } : { background: 'hsl(var(--muted) / 0.4)', boxShadow: 'inset 0 0 0 1px hsl(var(--border))' }}
                    >
                      <div className={`text-2xl flex-shrink-0 ${earned ? '' : 'grayscale'}`}>{earned ? meta.icon : '🔒'}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${earned ? '' : 'text-muted-foreground'}`} style={earned ? { color: meta.color } : {}}>{t.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{earned ? t.desc : 'Not yet discovered'}</p>
                        {earned && rec?.first_found_date && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Found {new Date(rec.first_found_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {rec.count > 1 && ` · ×${rec.count}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Badges */}
      <h2 className="font-heading font-600 text-lg mt-8 mb-3">Badges</h2>
      <div className="p-5 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-olo" />
          <p className="text-sm text-muted-foreground">{stats.milestones} milestones earned</p>
        </div>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
          {BADGES.map((b) => {
            const meta = RARITY_META[b.rarity] || RARITY_META.uncommon;
            return (
              <div key={b.id} className="flex-shrink-0 w-20 p-3 rounded-2xl text-center" style={{ background: `${meta.color}1a`, boxShadow: `inset 0 0 0 1px ${meta.color}40` }}>
                <div className="text-2xl mb-1">{b.icon}</div>
                <p className="text-[10px] font-semibold truncate" style={{ color: meta.color }}>{b.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 p-3 rounded-xl bg-olo/5 border border-olo/20 text-olo text-xs text-center">
        Discoveries happen everywhere in teewai — scan a new food, log a drink you've never tracked, or harvest a ripe Enamel Bloom. Every find builds your Collection.
      </div>
    </div>
  );
}