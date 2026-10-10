import { Scale } from 'lucide-react';
import ExamCard from './ExamCard';
import { scoreTone } from './examTone';

const Bar = ({ label, value }) => (
  <div className="flex items-center gap-2 text-caption">
    <span className="w-12 text-muted-foreground">{label}</span>
    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${scoreTone(value).bg}`} style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
    </div>
    <span className="w-8 text-right tabular-nums">{value != null ? Math.round(value) : '—'}</span>
  </div>
);

// Left vs right and upper vs lower — reveals brushing and chewing habits.
export default function BalanceCard({ symmetry }) {
  if (!symmetry) return null;
  return (
    <ExamCard icon={Scale} title="Side-by-side balance" subtitle="Uneven sides usually point to a habit">
      <div className="space-y-2 mb-3">
        <Bar label="Left" value={symmetry.left_score} />
        <Bar label="Right" value={symmetry.right_score} />
        <Bar label="Upper" value={symmetry.upper_score} />
        <Bar label="Lower" value={symmetry.lower_score} />
      </div>
      {symmetry.note && <p className="text-caption text-muted-foreground">{symmetry.note}</p>}
    </ExamCard>
  );
}