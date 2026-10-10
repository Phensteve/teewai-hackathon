import { Link } from 'react-router-dom';
import { Sun, Moon, Utensils, Shield, Lock, ArrowRight } from 'lucide-react';
import RoutineStep from './RoutineStep';

// Compact routine card for the dashboard. Shows the active routine's title,
// a summary, step counts, and a link to the full routine page.
export default function RoutineCard({ routine }) {
  if (!routine) return null;
  const lockedCount = [
    ...routine.morning_steps,
    ...routine.evening_steps,
    ...(routine.dietary_guidance || []),
  ].filter((s) => s.locked).length;

  return (
    <Link
      to="/routine"
      className="block p-4 rounded-3xl border border-border bg-card hover:border-olo/30 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-label text-muted-foreground uppercase tracking-wider">Your routine</p>
          <h3 className="font-heading font-700 text-base leading-tight mt-0.5 truncate">{routine.title}</h3>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-olo transition-colors flex-shrink-0 mt-1" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{routine.summary}</p>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-olo/8 text-olo font-medium">
          <Sun className="w-3 h-3" /> {routine.morning_steps.length} morning
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-olo/8 text-olo font-medium">
          <Moon className="w-3 h-3" /> {routine.evening_steps.length} evening
        </span>
        {(routine.dietary_guidance?.length || 0) > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-olo/8 text-olo font-medium">
            <Utensils className="w-3 h-3" /> {routine.dietary_guidance.length} diet
          </span>
        )}
        {lockedCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning font-medium">
            <Lock className="w-3 h-3" /> {lockedCount} locked
          </span>
        )}
      </div>
    </Link>
  );
}