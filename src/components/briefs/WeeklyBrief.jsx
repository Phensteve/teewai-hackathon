import { TrendingUp, Coffee, Check, ArrowRight, CalendarDays, Trophy, Flame } from 'lucide-react';
import FoodImage from '@/components/FoodImage';
import ScanImage from '@/components/ScanImage';

export default function WeeklyBrief({ data }) {
  if (!data?.hasData) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nothing to report yet.</p>;
  }

  return (
    <div className="space-y-4">
      {data.sections.map((section, i) => {
        if (section.type === 'trend') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-muted/40">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-olo" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score trend</span>
              </div>
              <div className="flex items-start gap-3">
                <p className="text-sm leading-relaxed flex-1">{section.text}</p>
                {section.scan_image_url && (
                  <ScanImage url={section.scan_image_url} alt="Scan" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                )}
              </div>
              {section.delta != null && section.delta !== 0 && (
                <p className={`mt-1 text-lg font-heading font-700 ${section.delta > 0 ? 'text-olo' : 'text-rose-500'}`}>
                  {section.delta > 0 ? '+' : ''}{section.delta} points
                </p>
              )}
            </div>
          );
        }

        if (section.type === 'top_foods') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-muted/40">
              <div className="flex items-center gap-2 mb-2">
                <Coffee className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top staining foods</span>
              </div>
              <p className="text-sm leading-relaxed mb-2">{section.text}</p>
              {section.foods && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {section.foods.map((f, j) => (
                    <div key={j} className="flex-shrink-0 w-20 text-center">
                      {f.image_url ? (
                        <FoodImage url={f.image_url} alt={f.name} className="w-16 h-16 rounded-xl object-cover mx-auto" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto">
                          <Coffee className="w-5 h-5 text-amber-500" />
                        </div>
                      )}
                      <p className="text-[10px] font-medium mt-1 truncate">{f.name}</p>
                      <p className="text-[9px] text-muted-foreground">{f.total} stain</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        if (section.type === 'brushing') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-muted/40">
              <div className="flex items-center gap-2 mb-1">
                <Check className="w-4 h-4 text-olo" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brushing consistency</span>
              </div>
              <p className="text-sm leading-relaxed">{section.text}</p>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: section.expected }).map((_, j) => (
                  <div
                    key={j}
                    className={`flex-1 h-2 rounded-full ${j < section.count ? 'bg-olo' : 'bg-muted'}`}
                  />
                ))}
              </div>
            </div>
          );
        }

        if (section.type === 'appointments') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Missed appointments</span>
              </div>
              <p className="text-sm leading-relaxed">{section.text}</p>
            </div>
          );
        }

        if (section.type === 'callback') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-olo/5 border border-olo/20">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRight className="w-4 h-4 text-olo" />
                <span className="text-xs font-semibold uppercase tracking-wider text-olo">Remember this?</span>
              </div>
              <p className="text-sm leading-relaxed">{section.text}</p>
              {section.image_url && (
                <div className="mt-2">
                  <FoodImage url={section.image_url} alt={section.foodName || 'Food'} className="w-16 h-16 rounded-xl object-cover" />
                </div>
              )}
            </div>
          );
        }

        if (section.type === 'whitest_day') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-gradient-to-br from-olo/10 to-olo/5 border border-olo/20">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-olo" />
                <span className="text-xs font-semibold uppercase tracking-wider text-olo">Whitest day</span>
              </div>
              <div className="flex items-start gap-3">
                <p className="text-sm leading-relaxed flex-1">{section.text}</p>
                {section.scan_image_url && (
                  <ScanImage url={section.scan_image_url} alt="Scan" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                )}
              </div>
            </div>
          );
        }

        if (section.type === 'highest_stain') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Biggest stain hit</span>
              </div>
              <p className="text-sm leading-relaxed">{section.text}</p>
              {section.image_url && (
                <div className="mt-2">
                  <FoodImage url={section.image_url} alt={section.foodName || 'Food'} className="w-16 h-16 rounded-xl object-cover" />
                </div>
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}