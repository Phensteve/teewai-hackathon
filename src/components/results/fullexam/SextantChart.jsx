import { useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import ExamCard from './ExamCard';
import { scoreTone, levelTone } from './examTone';

// Mouth map as the patient faces the camera: their right side is on the left.
const ROWS = [
  [['upper_right', 'Upper right'], ['upper_front', 'Upper front'], ['upper_left', 'Upper left']],
  [['lower_right', 'Lower right'], ['lower_front', 'Lower front'], ['lower_left', 'Lower left']],
];

export default function SextantChart({ sextants = [] }) {
  const [sel, setSel] = useState(null);
  if (!sextants.length) return null;
  const byKey = Object.fromEntries(sextants.map((s) => [s.sextant, s]));
  const active = sel ? byKey[sel] : null;
  return (
    <ExamCard icon={Grid3x3} title="Mouth map" subtitle="Six zones, the way a dentist charts your mouth. Tap one.">
      <div className="space-y-2">
        {ROWS.map((row, r) => (
          <div key={r} className="grid grid-cols-3 gap-2">
            {row.map(([key, label]) => {
              const s = byKey[key];
              const t = scoreTone(s?.health_score);
              return (
                <button key={key} onClick={() => setSel(sel === key ? null : key)}
                  className={`rounded-xl p-2.5 text-center border transition-colors ${t.soft} ${sel === key ? 'border-olo' : 'border-transparent'}`}>
                  <p className={`font-heading font-700 text-xl tabular-nums ${t.text}`}>{s?.health_score != null ? Math.round(s.health_score) : '—'}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {active && (
        <div className="mt-3 p-3 rounded-xl bg-muted/50 text-caption space-y-1">
          <p>{active.finding}</p>
          <p className="text-muted-foreground capitalize">
            Gums <span className={levelTone(active.gum)}>{active.gum || '—'}</span> · Plaque <span className={levelTone(active.plaque)}>{active.plaque || '—'}</span> · Wear {active.wear ?? '—'}/3 · Whiteness {active.whiteness_score != null ? Math.round(active.whiteness_score) : '—'}
          </p>
        </div>
      )}
    </ExamCard>
  );
}