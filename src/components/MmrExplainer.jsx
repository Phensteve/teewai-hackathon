import { useState } from 'react';
import { RANKS, getRank } from '@/lib/gamification';
import { HelpCircle, ChevronDown } from 'lucide-react';

// "What is MMR?" explainer for the leaderboard. Collapsible, highlights the
// user's current rank on the ladder.
export default function MmrExplainer({ mmr = 0 }) {
  const [open, setOpen] = useState(false);
  const cur = getRank(mmr);

  return (
    <div className="mt-6 rounded-3xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 p-5 text-left"
      >
        <HelpCircle className="w-5 h-5 text-olo flex-shrink-0" />
        <span className="font-heading font-600 text-base">What is MMR?</span>
        <ChevronDown className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
          <p className="mb-3">
            <strong className="text-foreground">Smile MMR</strong> (Match-Making Rating, borrowed from competitive games) is teewai's
            single number that summarizes how strong your smile journey is. It blends four things, so improving any one raises it:
          </p>
          <ul className="mb-4 space-y-1.5">
            <li><span className="text-olo">•</span> <strong className="text-foreground">Consistency</strong> — how often you scan (capped so spamming doesn't dominate).</li>
            <li><span className="text-olo">•</span> <strong className="text-foreground">Whiteness</strong> — your average whiteness score across scans.</li>
            <li><span className="text-olo">•</span> <strong className="text-foreground">Improvement</strong> — how much brighter you've gotten over time.</li>
            <li><span className="text-olo">•</span> <strong className="text-foreground">Health</strong> — your average dental-health score (gums, plaque, enamel).</li>
          </ul>
          <p className="mb-3">
            You climb a <strong className="text-foreground">ranked ladder</strong> as your MMR grows. Each rank has three tiers (III → II → I).
            You're currently <strong className="text-foreground">{cur.rank.icon} {cur.rank.name} {cur.tier}</strong>{cur.next ? <> — about <strong className="text-olo">{Math.round(cur.progress)}%</strong> toward {cur.next.icon} {cur.next.name}</> : ' — the top rank!'}.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {RANKS.map((r) => {
              const isCurrent = cur.rank.name === r.name;
              return (
                <span
                  key={r.name}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${isCurrent ? 'ring-2' : ''}`}
                  style={{ backgroundColor: `${r.color}22`, color: r.color, ...(isCurrent ? { boxShadow: `0 0 0 2px ${r.color}` } : {}) }}
                >
                  {r.icon} {r.name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}