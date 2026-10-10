import { useState } from 'react';
import { Lock, ChevronDown, ChevronUp } from 'lucide-react';

// One routine step. Locked steps show a lock badge and an expandable
// anti-recommendation reason ("Do not change this — ...").
export default function RoutineStep({ step, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`flex items-start gap-3 p-3 rounded-2xl border ${step.locked ? 'border-warning/20 bg-warning-soft/40' : 'border-border bg-card'}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading font-700 ${step.locked ? 'bg-warning/15 text-warning' : 'bg-olo/10 text-olo'}`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{step.label}</p>
          {step.locked && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning uppercase tracking-wider">
              <Lock className="w-2.5 h-2.5" /> Do not change
            </span>
          )}
        </div>
        {step.detail && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.detail}</p>}
        {step.locked && step.lockReason && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-warning/80 hover:text-warning transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide reason' : 'Why is this locked?'}
          </button>
        )}
        {expanded && step.lockReason && (
          <div className="mt-2 p-2.5 rounded-xl bg-warning/8 border border-warning/15">
            <p className="text-[11px] text-warning leading-relaxed">{step.lockReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}