import { Utensils, Droplet } from 'lucide-react';

// Inline question shown right after a food scan that included water. Choice
// one (drank it) keeps the existing water-in-meal stain dilution; choice two
// (rinsed) applies an extra rinse extrapolation. Warm, no interrogation.
export default function MealWaterPrompt({ foodName, onAnswer }) {
  return (
    <div className="mt-3 p-4 rounded-2xl border border-olo/30 bg-olo/5">
      <p className="text-sm font-medium mb-0.5">You had water with that {foodName || 'meal'}.</p>
      <p className="text-xs text-muted-foreground mb-3">Did you drink it with the meal, or rinse your mouth with it?</p>
      <div className="flex gap-2.5">
        <button
          onClick={() => onAnswer(false)}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-card border border-border text-sm font-medium py-2.5 rounded-xl active:scale-95 transition-transform"
        >
          <Utensils className="w-4 h-4" /> Drank it
        </button>
        <button
          onClick={() => onAnswer(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-olo/10 border border-olo/30 text-olo text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-transform"
        >
          <Droplet className="w-4 h-4" /> Rinsed
        </button>
      </div>
    </div>
  );
}