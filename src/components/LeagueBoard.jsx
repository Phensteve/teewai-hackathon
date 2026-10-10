import { useState, useEffect } from 'react';
import { getPercentile, generateRivals, getRank } from '@/lib/gamification';
import { Trophy, TrendingUp, Users } from 'lucide-react';

// Invisible scoreboard — social comparison that turns scanning into a status game.
// Shows percentile + weekly league with simulated rivals (creates urgency).
export default function LeagueBoard({ mmr, scans }) {
  const [rivals, setRivals] = useState([]);
  const percentile = getPercentile(mmr);

  useEffect(() => {
    setRivals(generateRivals(mmr, 4));
  }, [mmr]);

  const board = [
    ...rivals.map((r) => ({ ...r, isUser: false })),
    { name: 'You', mmr, scans: scans.length, isUser: true },
  ].sort((a, b) => b.mmr - a.mmr);

  const myRank = board.findIndex((b) => b.isUser) + 1;

  return (
    <div className="p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-600 text-lg">Smile league</h2>
      </div>

      {/* Percentile — the invisible scoreboard hook */}
      <div className="p-4 rounded-2xl bg-olo-deep text-white mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider">Global percentile</p>
            <p className="font-heading font-800 text-3xl text-olo">Top {Math.max(0.1, 100 - percentile).toFixed(1)}%</p>
          </div>
          <Users className="w-10 h-10 text-olo/40" />
        </div>
        <p className="text-xs text-white/50 mt-2">
          {percentile > 90 ? "Elite company — you're among the brightest smiles on teewai." : percentile > 70 ? "Climbing fast — keep scanning to break into the top tier." : "Scan consistently to climb the ranks."}
        </p>
      </div>

      {/* Weekly league — social comparison */}
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">This week's league</p>
      <div className="space-y-2">
        {board.map((entry, i) => {
          const { rank } = getRank(entry.mmr);
          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                entry.isUser ? 'bg-olo/10 border border-olo/30' : 'bg-muted/40'
              }`}
            >
              <span className={`font-heading font-700 text-sm w-6 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                {i + 1}
              </span>
              <span className="text-lg">{rank.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${entry.isUser ? 'text-olo' : ''}`}>{entry.name}</p>
                <p className="text-xs text-muted-foreground">{entry.scans} scans</p>
              </div>
              <span className="font-heading font-700 text-sm">{entry.mmr}</span>
            </div>
          );
        })}
      </div>
      {myRank > 1 && (
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> You're #{myRank} — scan again to climb!
        </p>
      )}
    </div>
  );
}