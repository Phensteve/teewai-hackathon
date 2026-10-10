import { MILESTONES, getNextMilestones, getEarnedMilestones } from '@/lib/gamification';
import { Target, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

// Milestone tracker — shows the next 3 milestones with real progress (from
// each milestone's `progress(stats)` function, not a hacky parseInt guess),
// a plain-language "why this matters" line, and earned milestones as a
// compact list. Designed to feel like a personal smile journal, not a game
// scoreboard.
export default function MilestoneTracker({ stats, earned = [] }) {
  const earnedList = getEarnedMilestones(stats);
  const next = getNextMilestones(stats, earned);
  const totalXP = earnedList.reduce((a, m) => a + m.xp, 0);

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-lg">Teewai Milestones</h2>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {earnedList.length}/{MILESTONES.length} · {totalXP} XP
        </span>
      </div>

      {/* Up next — the infinite hook */}
      {next.length > 0 && (
        <div className="mb-4">
          <p className="text-label text-muted-foreground mb-3">Up next</p>
          <div className="space-y-3">
            {next.slice(0, 3).map((m) => (
              <MilestoneRow key={m.id} milestone={m} stats={stats} />
            ))}
          </div>
        </div>
      )}

      {/* Earned — compact, scrollable */}
      {earnedList.length > 0 && (
        <div>
          <p className="text-label text-muted-foreground mb-2">Earned</p>
          <div className="flex flex-wrap gap-2">
            {earnedList.slice(-8).map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-olo/10 text-olo text-xs font-medium"
              >
                <Check className="w-3 h-3" /> {m.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MilestoneRow({ milestone, stats }) {
  const [expanded, setExpanded] = useState(false);
  const progress = Math.min(100, Math.max(0, milestone.progress(stats)));
  const isClose = progress >= 75;

  return (
    <div className={`p-3.5 rounded-2xl border ${isClose ? 'border-olo/30 bg-olo/5' : 'border-border bg-muted/30'}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between gap-3 w-full text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{milestone.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{milestone.desc}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-medium text-olo tabular-nums">+{milestone.xp} XP</span>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Progress bar */}
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-background overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isClose ? 'bg-olo' : 'bg-olo/50'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Why this matters — tap to expand */}
      {expanded && milestone.why && (
        <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
          {milestone.why}
        </p>
      )}
    </div>
  );
}