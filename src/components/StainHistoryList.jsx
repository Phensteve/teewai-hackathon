// StainHistoryList — the expandable day-by-day food scan history with infinite
// scroll. Extracted from WeekStainHistory so the stain tracker stays compact
// (chart + summary + link) while the full history lives on its own page.

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Flame, Utensils, Coffee, Wine, CupSoda, Apple, Cigarette, Leaf, Trash2 } from 'lucide-react';
import { saturateStainLoad } from '@/lib/stainLoad';
import { STAIN_CATALOG } from '@/lib/stainCatalog';
import FoodImage from '@/components/FoodImage';

const CATEGORY_ICON = {
  coffee: Coffee, tea: Coffee, wine: Wine, soda: CupSoda, juice: CupSoda,
  food: Utensils, fruit: Apple, sauce: Cigarette, habit: Cigarette, protective: Leaf,
};

const stainHex = (lvl) =>
  lvl >= 60 ? '#f43f5e' : lvl >= 30 ? '#f59e0b' : lvl > 0 ? '#14b8a6' : '#94a3b8';

const dayLabel = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' });
const dayNum = (d) => new Date(d + 'T00:00:00').getDate();
const prettyDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

const PAGE = 10;

// Pre-index the catalog by lowercase name so per-item mitigation lookup is O(1)
// instead of a full STAIN_CATALOG.find (with two toLowerCase calls) on every
// item on every render.
const CATALOG_BY_NAME = new Map(STAIN_CATALOG.map((c) => [c.name.toLowerCase(), c]));

export default function StainHistoryList({ logs, onRemove }) {
  const [expanded, setExpanded] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const sentinelRef = useRef(null);

  // Every day that has at least one log — drives the endless expandable list.
  const historyDays = useMemo(() => {
    const map = new Map();
    for (const l of logs) {
      const d = l.log_date;
      if (!d) continue;
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(l);
    }
    return Array.from(map.entries())
      .map(([date, items]) => ({
        date,
        label: dayLabel(date),
        num: dayNum(date),
        stain: saturateStainLoad(items.reduce((s, l) => s + (l.stain_level || 0), 0)),
        kcal: items.reduce((s, l) => s + (l.calories || 0), 0),
        items,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [logs]);

  const visibleDays = historyDays.slice(0, visibleCount);
  const hasMore = historyDays.length > visibleCount;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Infinite scroll — reveal more days as the sentinel enters view.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE, historyDays.length));
        }
      },
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, historyDays.length]);

  const toggle = (date) => setExpanded((e) => (e === date ? null : date));

  return (
    <div className="space-y-1.5">
      {visibleDays.map((d) => {
        const isOpen = expanded === d.date;
        const isToday = d.date === todayStr;
        return (
          <div key={d.date} className="rounded-2xl border border-border overflow-hidden bg-background/40">
            <button
              onClick={() => toggle(d.date)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
            >
              <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isToday ? 'bg-olo text-white' : 'bg-muted text-foreground'}`}>
                <span className="text-[9px] font-semibold uppercase leading-none">{d.label}</span>
                <span className="text-sm font-heading font-700 leading-none mt-0.5">{d.num}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{isToday ? 'Today' : prettyDate(d.date)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {d.items.length} item{d.items.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="w-2 h-2 rounded-full" style={{ background: stainHex(d.stain) }} />
                    <span className="text-xs font-semibold">{d.stain}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <Flame className="w-2.5 h-2.5 text-warning" />
                    <span className="text-[11px] text-muted-foreground">{d.kcal} kcal</span>
                  </div>
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 pt-1 space-y-1.5">
                    {d.items.map((l) => {
                      const Icon = CATEGORY_ICON[l.category] || Utensils;
                      const itemOpen = expandedItem === l.id;
                      const cat = CATALOG_BY_NAME.get((l.item_name || '').toLowerCase());
                      const mitigation = l.description || cat?.mitigation;
                      return (
                        <div key={l.id} className="rounded-xl bg-muted/40 overflow-hidden">
                          <button
                            onClick={() => setExpandedItem(itemOpen ? null : l.id)}
                            className="w-full flex items-center gap-3 p-2 text-left"
                          >
                            {l.image_url ? (
                              <FoodImage url={l.image_url} alt={l.item_name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-olo" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{l.item_name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {l.source === 'ai_scan' ? 'AI scan' : 'Catalog'} · {l.stain_level} stain{l.calories ? ` · ${l.calories} kcal` : ''}
                              </p>
                            </div>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stainHex(l.stain_level) }} />
                            <motion.div animate={{ rotate: itemOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            </motion.div>
                          </button>
                          <AnimatePresence initial={false}>
                            {itemOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 pt-0.5 space-y-2.5 text-[11px] text-muted-foreground">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card capitalize">{l.category || 'food'}</span>
                                    <span>{l.source === 'ai_scan' ? 'AI scan' : 'Catalog match'}</span>
                                    <span>· {prettyDate(l.log_date)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-16">Stain load</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-card overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, l.stain_level || 0)}%`, background: stainHex(l.stain_level) }} />
                                    </div>
                                    <span className="font-semibold text-foreground w-6 text-right">{l.stain_level || 0}</span>
                                  </div>
                                  {l.calories ? (
                                    <div className="flex items-center gap-2">
                                      <Flame className="w-3 h-3 text-warning" />
                                      <span>{l.calories} kcal</span>
                                    </div>
                                  ) : null}
                                  {mitigation && (
                                    <p className="leading-relaxed text-foreground/80">💡 {mitigation}</p>
                                  )}
                                  {onRemove && (
                                    <button
                                      onClick={() => onRemove(l.id)}
                                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-danger transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Remove entry
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {historyDays.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center mb-2.5">
            <Utensils className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No history yet — scan or add a food to start tracking.</p>
        </div>
      )}

      {/* Infinite-scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-4">
          <div className="w-4 h-4 rounded-full border-2 border-muted border-t-olo animate-spin" />
          <span className="text-[11px] text-muted-foreground">Loading more days…</span>
        </div>
      )}
    </div>
  );
}