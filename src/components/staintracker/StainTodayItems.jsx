// Today's logged stain items — list with Von Restorff isolate on the
// highest-stain item. Pure presentational.
import { Utensils, Trash2 } from 'lucide-react';
import FoodImage from '@/components/FoodImage';
import Spinner from '@/components/Spinner';
import FoodChemistryChips from '@/components/FoodChemistryChips';
import { stainColor } from './StainLoadMeter';

const CATEGORY_ICON = {
  coffee: Utensils, tea: Utensils, wine: Utensils, soda: Utensils, juice: Utensils,
  food: Utensils, fruit: Utensils, sauce: Utensils, habit: Utensils, protective: Utensils,
};

export default function StainTodayItems({ todayItems, topStainId, onRemove }) {
  if (todayItems.length === 0) return null;
  return (
    <div className="mt-4 p-5 rounded-3xl border border-border bg-card">
      <span className="text-sm font-medium text-muted-foreground">Logged today</span>
      <div className="mt-3 space-y-2">
        {todayItems.map((l) => {
          const Icon = CATEGORY_ICON[l.category] || Utensils;
          const isTop = l.id === topStainId;
          return (
            <div
              key={l.id}
              className={`flex items-center gap-3 p-3 rounded-2xl ${
                isTop ? 'border border-olo bg-olo/5 shadow-2' : 'bg-muted/40'
              } ${l._saving ? 'opacity-60' : ''}`}
            >
              {l.image_url ? (
                <FoodImage url={l.image_url} alt={l.item_name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
                  {l._saving ? <Spinner size={16} /> : <Icon className="w-4 h-4 text-olo" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{l.item_name}</p>
                  {isTop && (
                    <span className="text-[10px] font-semibold text-olo bg-olo/15 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Top stain
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {l._saving
                    ? 'Saving…'
                    : `${l.category === 'protective' ? 'Protective' : l.source === 'ai_scan' ? 'AI scan' : 'Catalog'} · ${l.stain_level} stain${l.calories ? ` · ${l.calories} kcal` : ''}`}
                </p>
                {!l._saving && (l.chromogenic || l.tannin || l.acidity) ? (
                  <FoodChemistryChips
                    scores={{ chromogenic: l.chromogenic, tannin: l.tannin, acidity: l.acidity }}
                    variant="card"
                    className="mt-1.5"
                  />
                ) : null}
              </div>
              {!l._saving && <span className={`w-2 h-2 rounded-full ${stainColor(l.stain_level)}`} />}
              {!l._saving && (
                <button
                  onClick={() => onRemove(l.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-danger transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}