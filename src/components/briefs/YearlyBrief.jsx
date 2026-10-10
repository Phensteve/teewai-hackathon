import { Palette, Camera, TrendingUp, Coffee, ArrowRight, CalendarDays, Trophy, Flame } from 'lucide-react';
import FoodImage from '@/components/FoodImage';
import ScanImage from '@/components/ScanImage';

export default function YearlyBrief({ data }) {
  if (!data?.hasData) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nothing to report yet.</p>;
  }

  return (
    <div className="space-y-4">
      {data.sections.map((section, i) => {
        if (section.type === 'shade_journey') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-gradient-to-br from-olo/10 to-olo/5 border border-olo/20">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-olo" />
                <span className="text-xs font-semibold uppercase tracking-wider text-olo">Year in shade</span>
              </div>
              <div className="flex items-start gap-3">
                <p className="text-base font-heading font-600 leading-relaxed flex-1">{section.text}</p>
                {section.scan_image_url && (
                  <ScanImage url={section.scan_image_url} alt="Scan" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                )}
              </div>
            </div>
          );
        }

        if (section.type === 'total_scans') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-muted/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
                <Camera className="w-5 h-5 text-olo" />
              </div>
              <p className="text-sm leading-relaxed flex-1">{section.text}</p>
            </div>
          );
        }

        if (section.type === 'best_month') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-muted/40">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-olo" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Biggest improvement</span>
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

        if (section.type === 'top_foods') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-muted/40">
              <div className="flex items-center gap-2 mb-3">
                <Coffee className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top staining foods</span>
              </div>
              <p className="text-sm leading-relaxed mb-3">{section.text}</p>
              <div className="space-y-2">
                {section.foods?.map((f, j) => (
                  <div key={j} className="flex items-center gap-3 p-2 rounded-xl bg-card">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {j + 1}
                    </span>
                    {f.image_url ? (
                      <FoodImage url={f.image_url} alt={f.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Coffee className="w-4 h-4 text-amber-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.count} time{f.count === 1 ? '' : 's'} · {f.total} total stain</p>
                    </div>
                  </div>
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

        if (section.type === 'score_arc') {
          return (
            <div key={i} className="p-4 rounded-2xl bg-gradient-to-r from-olo/10 to-olo/5 border border-olo/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-olo" />
                <span className="text-xs font-semibold uppercase tracking-wider text-olo">Score arc</span>
              </div>
              <div className="flex items-start gap-3">
                <p className="text-sm leading-relaxed flex-1">{section.text}</p>
                {section.scan_image_url && (
                  <ScanImage url={section.scan_image_url} alt="Scan" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                )}
              </div>
              {section.firstScore != null && section.lastScore != null && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-2xl font-heading font-700 text-muted-foreground">{section.firstScore}</span>
                  <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-muted-foreground/40 to-olo" />
                  <span className="text-2xl font-heading font-700 text-olo">{section.lastScore}</span>
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

      {!data.hasAppts && (
        <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
          Data from your scans and food logs.
        </p>
      )}
    </div>
  );
}