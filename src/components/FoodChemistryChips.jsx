import { Droplet } from 'lucide-react';

// Compact chromogen / tannin / acid readout for a food-scan item. Renders the
// three staining-element scores as colored chips so the user sees *why* a food
// stains, not just a single stain-level number. Hidden when no scores are
// present (older pipeline / catalog-only items).
//
// variant="overlay" → for the dark food-scan modal backdrop.
// variant="card"    → for light card surfaces (logged-item lists).

const TONE = {
  overlay: {
    chromogenic: 'bg-rose-500/20 text-rose-300',
    tannin: 'bg-amber-500/20 text-amber-300',
    acidity: 'bg-orange-500/20 text-orange-300',
  },
  card: {
    chromogenic: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    tannin: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    acidity: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
};

const LABEL = { chromogenic: 'Chromogen', tannin: 'Tannin', acidity: 'Acid' };

export default function FoodChemistryChips({ scores, variant = 'overlay', className = '' }) {
  if (!scores) return null;
  const entries = ['chromogenic', 'tannin', 'acidity']
    .map((k) => ({ k, v: Number(scores[k]) }))
    .filter((e) => Number.isFinite(e.v));
  if (!entries.length) return null;
  const tone = TONE[variant] || TONE.overlay;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {entries.map(({ k, v }) => (
        <span key={k} className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tone[k]}`}>
          <Droplet className="w-2.5 h-2.5" /> {LABEL[k]} {Math.round(v)}
        </span>
      ))}
    </div>
  );
}