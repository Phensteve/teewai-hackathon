import { Trophy } from 'lucide-react';
import DeviceCanvas from './DeviceCanvas';
import PhoneStatusBar from './PhoneStatusBar';
import PhoneTabBar from './PhoneTabBar';

const ROWS = [
  { rank: 0, name: 'Chidi O.', scans: 24, mmr: 2840, tier: 'Diamond', badge: '💎', color: '#60a5fa' },
  { rank: 1, name: 'Amara N.', scans: 19, mmr: 2610, tier: 'Diamond', badge: '💎', color: '#60a5fa' },
  { rank: 2, name: 'Ada O.', scans: 12, mmr: 1840, tier: 'Gold', badge: '🏆', color: '#fbbf24', isUser: true },
  { rank: 3, name: 'Tunde A.', scans: 8, mmr: 1520, tier: 'Silver', badge: '🥈', color: '#94a3b8' },
  { rank: 4, name: 'Zara M.', scans: 6, mmr: 980, tier: 'Bronze', badge: '🥉', color: '#cd7f32' },
  { rank: 5, name: 'Ify K.', scans: 4, mmr: 760, tier: 'Bronze', badge: '🥉', color: '#cd7f32' },
];

export default function LeaderboardSnapshot() {
  return (
    <DeviceCanvas>
      <div className="w-full h-full bg-background flex flex-col text-foreground">
        <PhoneStatusBar />

        <div className="text-center px-6 pt-2 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6 text-olo" />
          </div>
          <h1 className="font-heading font-700 text-[22px] tracking-tight">Smile leaderboard</h1>
          <p className="text-[12px] text-muted-foreground mt-1 leading-snug">
            Display names and tiers only — scores stay private.
          </p>
        </div>

        {/* Your position */}
        <div className="mx-5 p-4 rounded-2xl border border-olo/30 bg-olo/5 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.12em]">Your position</p>
            <p className="font-heading font-800 text-[32px] text-olo leading-tight tabular-nums">#3</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.12em] mb-1.5">Your tier</p>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold"
              style={{ backgroundColor: '#fbbf2422', color: '#fbbf24' }}
            >
              🏆 Gold III
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-5 space-y-2 overflow-hidden">
          {ROWS.map((r) => (
            <div
              key={r.rank}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border ${
                r.isUser ? 'border-olo bg-olo/10' : 'border-border bg-card'
              }`}
            >
              <div className="w-6 text-center shrink-0 text-[15px]">
                {r.rank < 3 ? (
                  ['🥇', '🥈', '🥉'][r.rank]
                ) : (
                  <span className="text-[14px] font-heading font-700 text-muted-foreground tabular-nums">
                    {r.rank + 1}
                  </span>
                )}
              </div>
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-[14px] font-heading font-700 text-muted-foreground">
                {r.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-semibold truncate ${r.isUser ? 'text-olo' : ''}`}>
                  {r.name}
                  {r.isUser && <span className="text-[11px] text-muted-foreground font-normal"> (you)</span>}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {r.scans} scans · {r.mmr} MMR
                </p>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0"
                style={{ backgroundColor: `${r.color}22`, color: r.color }}
              >
                {r.badge} {r.tier}
              </span>
            </div>
          ))}
        </div>

        <PhoneTabBar active={2} />
      </div>
    </DeviceCanvas>
  );
}