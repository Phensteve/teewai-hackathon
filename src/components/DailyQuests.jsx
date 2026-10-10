import { Check, Target } from 'lucide-react';
import { generateDailyQuests } from '@/lib/gamification';

// Seamless daily goals — feels like natural intentions, not game quests.
export default function DailyQuests({ stats }) {
  const quests = generateDailyQuests(stats);
  const completed = quests.filter(q => q.done).length;

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-olo" />
          <h3 className="font-heading font-600 text-lg">Today's focus</h3>
        </div>
        <span className="text-sm text-muted-foreground">{completed}/{quests.length} done</span>
      </div>
      <div className="space-y-2.5">
        {quests.map((q) => (
          <div
            key={q.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              q.done ? 'bg-olo/5 border border-olo/20' : 'bg-muted/30 border border-transparent'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              q.done ? 'bg-olo text-white' : 'border-2 border-border'
            }`}>
              {q.done && <Check className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${q.done ? 'text-olo' : 'text-foreground'}`}>{q.label}</p>
              <p className="text-xs text-muted-foreground">{q.desc}</p>
            </div>
            <span className="text-xs font-medium text-olo flex-shrink-0">+{q.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}