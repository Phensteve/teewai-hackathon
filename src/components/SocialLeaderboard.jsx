import { useState, useEffect } from 'react';
import { generateRivals, getRank, getPercentile } from '@/lib/gamification';
import { Trophy } from 'lucide-react';

export default function SocialLeaderboard({ mmr, scans }) {
  const [rivals, setRivals] = useState([]);

  useEffect(() => {
    setRivals(generateRivals(mmr, 7));
  }, [mmr]);

  const board = [
    ...rivals.map(r => ({ ...r, isUser: false })),
    { name: 'You', mmr, scans: scans.length, isUser: true },
  ].sort((a, b) => b.mmr - a.mmr);

  const myRank = board.findIndex(b => b.isUser) + 1;
  const percentile = getPercentile(mmr);
  const top3 = board.slice(0, 3);
  const rest = board.slice(3);
  const podiumOrder = [1, 0, 2]; // silver, gold, bronze
  const medals = ['🥈', '🥇', '🥉'];
  const heights = ['h-20', 'h-24', 'h-16'];

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-olo" />
          <h3 className="font-heading font-600 text-lg">Smile leaderboard</h3>
        </div>
        <span className="text-xs font-medium text-olo bg-olo/10 px-3 py-1 rounded-full">Top {Math.max(0.1, 100 - percentile).toFixed(1)}%</span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3 italic">Practice rivals are AI training partners — beat them to climb the real leaderboard</p>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 items-end">
        {podiumOrder.map((idx, displayIdx) => {
          const entry = top3[idx];
          if (!entry) return <div key={idx} />;
          const { rank } = getRank(entry.mmr);
          return (
            <div key={idx} className="flex flex-col items-center">
              <div className="text-2xl mb-1">{medals[displayIdx]}</div>
              <div className={`w-full ${heights[displayIdx]} rounded-t-2xl ${entry.isUser ? 'bg-olo/20 border-2 border-olo border-b-0' : 'bg-muted/50 border border-border border-b-0'} flex flex-col items-center justify-center pt-2 px-1`}>
                <span className="text-lg">{rank.icon}</span>
                <p className={`text-xs font-semibold truncate max-w-full ${entry.isUser ? 'text-olo' : ''}`}>{entry.name}</p>
                <p className="text-xs text-muted-foreground">{entry.mmr}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest of the list */}
      <div className="space-y-1.5">
        {rest.map((entry, i) => {
          const { rank } = getRank(entry.mmr);
          const pos = i + 4;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-2.5 rounded-xl ${entry.isUser ? 'bg-olo/10 border border-olo/30' : 'bg-muted/30'}`}
            >
              <span className="font-heading font-700 text-sm w-6 text-center text-muted-foreground">{pos}</span>
              <span className="text-base">{rank.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${entry.isUser ? 'text-olo' : ''}`}>
                  {entry.name}
                  {entry.isGhost && <span className="ml-1 text-[9px] text-muted-foreground/60">ghost</span>}
                </p>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">{entry.scans} scans</span>
              <span className="font-heading font-700 text-sm">{entry.mmr}</span>
            </div>
          );
        })}
      </div>

      {myRank > 3 && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          You're ranked <span className="font-semibold text-olo">#{myRank}</span> — scan again to climb!
        </p>
      )}
    </div>
  );
}