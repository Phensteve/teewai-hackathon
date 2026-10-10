import { getRank, RANKS } from '@/lib/gamification';
import { TrendingUp, Crown } from 'lucide-react';

// MMR rank display — LoL-style ranked ladder with tiers.
// Peak rank badge creates loss aversion (you fear losing your status).
export default function MmrRank({ mmr, peakMmr, peakRank }) {
  const { rank, next, progress, tier } = getRank(mmr);
  const peak = peakRank || rank.name;

  return (
    <div className="p-6 rounded-3xl border border-border bg-card relative overflow-hidden">
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20"
        style={{ background: rank.color }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: `${rank.color}20`, boxShadow: `0 0 30px -5px ${rank.glow}` }}
            >
              {rank.icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Smile rank</p>
              <p className="font-heading font-800 text-2xl" style={{ color: rank.color }}>
                {rank.name} {tier}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">MMR</p>
            <p className="font-heading font-700 text-xl">{mmr}</p>
          </div>
        </div>

        {next && (
          <>
            <div className="w-full bg-muted rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress}%`, background: rank.color, boxShadow: `0 0 10px ${rank.glow}` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {next.min - mmr} MMR to <span style={{ color: next.color }}>{next.name}</span>
            </p>
          </>
        )}

        {peakMmr > mmr && (
          <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-champagne/10">
            <Crown className="w-4 h-4 text-champagne" />
            <p className="text-xs text-champagne font-medium">
              Peak: {peak} ({peakMmr} MMR) — don't let it slip!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}