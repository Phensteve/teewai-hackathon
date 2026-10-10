import { useEffect, useState, useMemo } from 'react';
import SkeletonBlock from '@/components/loading/SkeletonBlock';
import { Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { Trophy, Crown, Flame, TrendingUp, Calendar, WifiOff, RotateCcw } from 'lucide-react';
import { getRank } from '@/lib/gamification';
import MmrExplainer from '@/components/MmrExplainer';
import PullToRefresh from '@/components/PullToRefresh';

// Strava-inspired time period filters — their signature leaderboard feature.
// "Today / This Week / This Month / All-Time" lets users see who's climbing
// right now, not just all-time dominators (social comparison theory: people
// are motivated by winnable, near-term competition, not distant elites).
const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All-Time' },
];

const TierBadge = ({ rank }) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
    style={{ backgroundColor: `${rank.color}22`, color: rank.color }}
  >
    <span className="text-xs">{rank.icon}</span> {rank.name}
  </span>
);

export default function Leaderboard() {
  const [period, setPeriod] = useState(() => localStorage.getItem('teewai_lb_period') || 'week');
  // Paint cached data for the initial period instantly so the page doesn't
  // wait on the (often-unavailable) backend before showing anything.
  const initialCache = (() => {
    try { return JSON.parse(localStorage.getItem(`teewai_lb_data_${period}`) || 'null'); } catch { return null; }
  })();
  const [rows, setRows] = useState(initialCache ? (initialCache.rows || []).map((r) => ({ ...r, rank: getRank(r.mmr) })) : []);
  const [me, setMe] = useState(initialCache?.me ? { ...initialCache.me, rank: getRank(initialCache.me.mmr) } : null);
  const [myPosition, setMyPosition] = useState(initialCache?.myPosition || null);
  const [consistency, setConsistency] = useState(initialCache ? (initialCache.consistency || []).map((r) => ({ ...r, rank: getRank(r.mmr) })) : []);
  const [total, setTotal] = useState(initialCache?.total || 0);
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState('');

  const applyData = (data) => {
    setRows((data.rows || []).map((r) => ({ ...r, rank: getRank(r.mmr) })));
    setMe(data.me ? { ...data.me, rank: getRank(data.me.mmr) } : null);
    setMyPosition(data.myPosition || null);
    setConsistency((data.consistency || []).map((r) => ({ ...r, rank: getRank(r.mmr) })));
    setTotal(data.total || 0);
  };

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    return unrufld.functions.invoke('leaderboard', { period })
      .then((res) => {
        const data = res.data || {};
        applyData(data);
        try { localStorage.setItem(`teewai_lb_data_${period}`, JSON.stringify(data)); } catch {}
      })
      .catch((e) => {
        // Backend unavailable — fall back to cached data for this period so
        // the leaderboard persists and selections still change the view.
        try {
          const cached = JSON.parse(localStorage.getItem(`teewai_lb_data_${period}`) || 'null');
          if (cached) applyData(cached);
          else setError(e?.message || 'Could not load leaderboard');
        } catch {
          setError(e?.message || 'Could not load leaderboard');
        }
      })
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => {
    localStorage.setItem('teewai_lb_period', period);
    // Paint this period's cache instantly, then refresh silently in the
    // background — only show a spinner when there's no cached data yet.
    let hasCache = false;
    try {
      const cached = JSON.parse(localStorage.getItem(`teewai_lb_data_${period}`) || 'null');
      if (cached) { applyData(cached); hasCache = true; }
    } catch {}
    load(!hasCache);
  }, [period]);

  // Show every ranked smiler the backend returns (up to 50), not just the top
  // 10. If you fall outside the returned set, a gap (⋯) pins your row at the
  // bottom so you still see your own position.
  const { displayRows, showGap, myRow } = useMemo(() => {
    const inList = me && rows.some((r) => r.isUser);
    const my = me && !inList && !me.optedOut ? { ...me, rank: getRank(me.mmr) } : null;
    return { displayRows: rows, showGap: !!my, myRow: my };
  }, [rows, me]);

  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null);

  return (
    <PullToRefresh onRefresh={() => load(true)} className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-3">
          <Trophy className="w-7 h-7 text-olo" />
        </div>
        <h1 className="font-heading font-700 text-2xl tracking-tight mb-1">Smile leaderboard</h1>
      </div>

      {/* Strava-style time period filter */}
      <div className="flex gap-1.5 mb-4 p-1 rounded-2xl bg-muted/50">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
              period === p.key
                ? 'bg-olo text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="p-6 rounded-2xl border border-danger/30 bg-danger-soft flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center">
            <WifiOff className="w-6 h-6 text-danger" />
          </div>
          <div>
            <p className="font-heading font-600 text-foreground mb-1">We couldn't load the leaderboard</p>
            <p className="text-sm text-muted-foreground">This is usually a connection hiccup. Try again — your rank and scans are safe.</p>
          </div>
          <button onClick={() => load()} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:scale-105 transition-transform olo-glow">
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
        </div>
      ) : (
        <>
          {/* Your position — Strava always shows your rank prominently */}
          <div className="mb-4 p-4 rounded-3xl border border-olo/30 bg-olo/5">
            {me?.optedOut ? (
              <div className="text-center py-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Leaderboard</p>
                <p className="font-heading font-700 text-lg text-foreground">You're opted out</p>
                <p className="text-xs text-muted-foreground mt-1">Your scans stay private. Enable the leaderboard in <Link to="/profile" className="text-olo font-medium">Profile</Link> to see your rank.</p>
              </div>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Your position</p>
                  <p className="font-heading font-800 text-3xl text-olo">{myPosition ? `#${myPosition}` : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{total} smilers ranked this period</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your tier</p>
                  <TierBadge rank={me?.rank || getRank(0)} />
                </div>
              </div>
            )}
          </div>

          {/* Local Legend — Strava's consistency leader (most scans, not highest MMR) */}
          {consistency.length > 0 && consistency[0]?.scans > 0 && (
            <div className="mb-4 p-4 rounded-3xl border border-warning/30 bg-warning/5">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-warning" />
                <h2 className="font-heading font-600 text-sm">Most consistent</h2>
                <span className="text-[10px] text-muted-foreground ml-auto">most scans this period</span>
              </div>
              <div className="space-y-1.5">
                {consistency.slice(0, 3).map((r, i) => (
                  <div
                    key={(r.user_id || '') + i}
                    className={`flex items-center gap-2.5 p-2 rounded-xl ${r.isUser ? 'bg-olo/10' : 'bg-card/50'}`}
                  >
                    <span className={`font-heading font-700 text-xs w-5 text-center ${i === 0 ? 'text-warning' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 font-heading font-700 text-xs text-muted-foreground">
                      {(r.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <p className={`flex-1 min-w-0 text-sm font-medium truncate ${r.isUser ? 'text-olo' : ''}`}>
                      {r.name} {r.isUser && <span className="text-xs text-muted-foreground font-normal">(you)</span>}
                    </p>
                    <span className="text-xs font-semibold text-warning">{r.scans} scans</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ranking — 55vh scrollable list (Strava-style) */}
          {loading ? (
            <div role="status" aria-label="Loading ranking"><SkeletonBlock type="rows" count={6} /></div>
          ) : rows.length === 0 ? (
            <div className="p-8 rounded-3xl border border-dashed border-border text-center text-muted-foreground text-sm">
              No scans in this period yet. Take a scan to appear on the leaderboard.
            </div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                <TrendingUp className="w-4 h-4 text-olo" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ranking</span>
                <span className="text-xs text-muted-foreground ml-auto">by Smile MMR</span>
              </div>
              <div className="overflow-y-auto no-scrollbar" style={{ height: '55vh' }}>
                <div className="divide-y divide-border">
                  {displayRows.map((r, i) => (
                    <div
                      key={(r.user_id || '') + i}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        r.isUser ? 'bg-olo/10' : 'bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="w-7 text-center flex-shrink-0">
                        {i === 0 ? (
                          <Crown className="w-5 h-5 mx-auto text-warning" />
                        ) : medal(i) ? (
                          <span className="text-lg">{medal(i)}</span>
                        ) : (
                          <span className="font-heading font-700 text-sm text-muted-foreground">{i + 1}</span>
                        )}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 font-heading font-700 text-sm text-muted-foreground">
                        {(r.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${r.isUser ? 'text-olo' : ''}`}>
                          {r.name} {r.isUser && <span className="text-xs text-muted-foreground font-normal">(you)</span>}
                        </p>
                        {r.prev_names?.length > 0 && (
                          <p className="text-[10px] text-warning/80 truncate">formerly {r.prev_names.join(', ')}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{r.scans} scans · {r.mmr} MMR</p>
                      </div>
                      <TierBadge rank={r.rank} />
                    </div>
                  ))}

                  {/* Strava gap: "⋯" between top 10 and your position */}
                  {showGap && (
                    <div className="flex items-center justify-center py-2 bg-muted/20">
                      <span className="text-muted-foreground text-lg tracking-widest">⋯</span>
                    </div>
                  )}

                  {/* Your row pinned at the bottom (if outside top 10) */}
                  {myRow && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-olo/10 border-t-2 border-olo/30">
                      <div className="w-7 text-center flex-shrink-0">
                        <span className="font-heading font-700 text-sm text-olo">{myPosition || '—'}</span>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-olo/20 flex items-center justify-center flex-shrink-0 font-heading font-700 text-sm text-olo">
                        {(myRow.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-olo">
                          {myRow.name} <span className="text-xs text-muted-foreground font-normal">(you)</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{myRow.scans} scans · {myRow.mmr} MMR</p>
                      </div>
                      <TierBadge rank={myRow.rank} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
            <Calendar className="w-3 h-3" />
            Ranked by real teewai scans this {period === 'all' ? 'all time' : period === 'today' ? 'day' : period === 'week' ? 'week' : 'month'}. Keep scanning to climb.
          </p>

          <MmrExplainer mmr={me?.mmr || 0} />
        </>
      )}
    </PullToRefresh>
  );
}