import { Smile } from 'lucide-react';
import ExamCard from './ExamCard';
import { levelTone, pretty } from './examTone';

// Bite / alignment screen, made possible by the side views.
export default function BiteCard({ bite, consensus }) {
  if (!bite) return null;
  const rows = [
    ['Midline', bite.midline],
    ['Crowding', bite.crowding],
    ['Spacing', bite.spacing],
    ['Overbite', bite.overbite],
    ['Grinding signs', bite.wear_facets ? 'possible' : 'none seen'],
    ['Shade agreement', consensus?.shade_agreement],
  ];
  return (
    <ExamCard icon={Smile} title="Bite & alignment" subtitle="A screen from your side photos, not a diagnosis">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
            <p className={`text-caption font-semibold capitalize ${k === 'Grinding signs' ? (bite.wear_facets ? 'text-warning' : 'text-success') : levelTone(v)}`}>{v ? pretty(v) : '—'}</p>
          </div>
        ))}
      </div>
      {bite.note && <p className="text-caption text-muted-foreground">{bite.note}</p>}
    </ExamCard>
  );
}