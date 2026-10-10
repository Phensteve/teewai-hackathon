import { Palette, Coffee, Check, AlertCircle } from 'lucide-react';
import FoodImage from '@/components/FoodImage';

export default function DailyBrief({ data }) {
  if (!data?.hasData) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nothing to report today. Come back tomorrow.</p>;
  }

  return (
    <div className="space-y-3">
      {data.lines.map((line, i) => {
        const icon = line.type === 'score' ? Palette
          : line.type === 'food' ? Coffee
          : (line.type === 'brush_reminder' || line.type === 'brush_done' || line.type === 'brush_missed') ? Check
          : line.type === 'flagged' ? AlertCircle
          : Palette;
        const Icon = icon;
        const color = line.type === 'flagged' ? 'text-amber-500'
          : line.type === 'brush_missed' ? 'text-muted-foreground'
          : 'text-olo';

        return (
          <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40">
            <div className="w-8 h-8 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed">{line.text}</p>
              {line.image_url && (
                <div className="mt-2">
                  <FoodImage url={line.image_url} alt={line.foodName || 'Food'} className="w-16 h-16 rounded-xl object-cover" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}