import { ListOrdered } from 'lucide-react';
import ExamCard from './ExamCard';
import { levelTone } from './examTone';

export default function PriorityPlan({ priorities = [] }) {
  if (!priorities.length) return null;
  return (
    <ExamCard icon={ListOrdered} title="Your top 3 priorities" subtitle="Ranked from everything all five photos showed">
      <ol className="space-y-3">
        {priorities.slice(0, 3).map((p, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-7 h-7 rounded-full bg-olo text-primary-foreground flex items-center justify-center font-heading font-700 text-sm flex-shrink-0">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-caption font-semibold">
                {p.title} <span className={`text-label normal-case tracking-normal ${levelTone(p.urgency)}`}>· {p.urgency}</span>
              </p>
              <p className="text-caption text-muted-foreground">{p.detail}</p>
              {p.teeth?.length > 0 && <p className="text-[11px] text-muted-foreground mt-0.5">Teeth: {p.teeth.join(', ')}</p>}
            </div>
          </li>
        ))}
      </ol>
    </ExamCard>
  );
}