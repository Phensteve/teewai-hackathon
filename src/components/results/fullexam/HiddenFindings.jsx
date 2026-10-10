import { EyeOff } from 'lucide-react';
import ExamCard from './ExamCard';
import { levelTone, ANGLE_LABELS } from './examTone';

// Findings a front-only quick scan could never have caught.
export default function HiddenFindings({ items = [] }) {
  return (
    <ExamCard icon={EyeOff} title="Only visible from other angles" subtitle="Things a front photo alone would have missed">
      {items.length === 0 ? (
        <p className="text-caption text-muted-foreground">Nothing extra turned up behind or beside your teeth. Good news.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-caption">
              <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 bg-current ${levelTone(f.severity)}`} />
              <span>
                {f.finding}
                <span className="text-muted-foreground"> · {ANGLE_LABELS[f.angle] || f.angle} view{f.tooth_id ? ` · ${f.tooth_id}` : ''}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </ExamCard>
  );
}