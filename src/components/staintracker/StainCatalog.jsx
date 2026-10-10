// Stain catalog — search, category filter, multiselect grid with 60vh scroll.
import { Search, X, Check, Plus, Coffee, Wine, CupSoda, Apple, Utensils, Cigarette, Leaf, Droplet } from 'lucide-react';
import { CATEGORIES } from '@/lib/stainCatalog';
import { getCalories } from '@/lib/foodCalories';
import { stainColor } from './StainLoadMeter';
import Spinner from '@/components/Spinner';

const CATEGORY_ICON = {
  coffee: Coffee, tea: Coffee, wine: Wine, soda: CupSoda, juice: CupSoda,
  food: Utensils, fruit: Apple, sauce: Droplet, habit: Cigarette, protective: Leaf,
};

export default function StainCatalog({
  query,
  setQuery,
  cat,
  setCat,
  filtered,
  selected,
  toggleSelect,
  onClear,
  onAdd,
  adding,
}) {
  return (
    <div className="mt-6 flex flex-col" style={{ height: '60vh' }}>
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="font-heading font-600 text-lg">Add from the catalog</h2>
        {selected.size > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear ({selected.size})
          </button>
        )}
      </div>
      <div className="relative mb-3 flex-shrink-0">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods & drinks…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-olo"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3 flex-shrink-0">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              cat === c.key
                ? 'bg-olo text-white'
                : 'bg-card border border-border text-muted-foreground hover:border-olo/40'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar -mx-1 px-1">
        <div className="grid grid-cols-2 gap-2.5">
          {filtered.map((item) => {
            const Icon = CATEGORY_ICON[item.category] || Utensils;
            const isSelected = selected.has(item.name);
            return (
              <button
                key={item.name}
                onClick={() => toggleSelect(item.name)}
                className={`relative text-left p-3.5 rounded-2xl border transition-all group ${
                  isSelected
                    ? 'border-olo bg-olo/10 ring-1 ring-olo'
                    : 'border-border bg-card hover:border-olo/40 hover:bg-olo/5'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-olo flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className="w-4 h-4 text-olo" />
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white ${stainColor(item.stain_level)} ${
                      isSelected ? 'opacity-0' : ''
                    }`}
                  >
                    {item.stain_level}
                  </span>
                </div>
                <p className="text-sm font-medium leading-tight">{item.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {getCalories(item.name) ? `${getCalories(item.name)} kcal · ` : ''}
                  {item.mitigation}
                </p>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No items match your search.</p>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-20 mt-4">
          <button
            onClick={onAdd}
            disabled={adding}
            className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white text-sm font-semibold py-3.5 rounded-2xl active:scale-95 transition-transform disabled:opacity-60 olo-glow"
          >
            {adding ? <Spinner size={16} /> : <Plus className="w-4 h-4" />}
            Add {selected.size} item{selected.size === 1 ? '' : 's'} to today
          </button>
        </div>
      )}
    </div>
  );
}