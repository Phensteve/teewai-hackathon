import { Link } from 'react-router-dom';
import { Utensils, ArrowRight } from 'lucide-react';
import FoodImage from '@/components/FoodImage';
import { generateAttributionLine } from '@/lib/foodAttribution';

// Food Attribution Insight card — appears on the results screen adjacent to
// the What-changed card. Shows a dynamic, natural line attributing a shade
// shift to a specific food the user scanned between their last two teeth
// scans. Read-only: never feeds baseline, What-changed, or purple logic.
export default function FoodAttributionCard({ attribution }) {
  if (!attribution) return null;

  const line = generateAttributionLine(attribution);
  if (!line) return null;

  const { foodImage, foodName, foodDate } = attribution;

  // Cross-link to the shade timeline, focused on the food event date.
  const timelineLink = `/timeline?focusDate=${encodeURIComponent(foodDate || '')}&food=${encodeURIComponent(foodName || '')}`;

  return (
    <div className="mb-4 rounded-2xl border border-olo/20 bg-gradient-to-br from-olo/5 to-card frost-edge overflow-hidden animate-fade-up">
      <div className="flex items-start gap-3 p-4">
        {/* Food thumbnail */}
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-muted">
          {foodImage ? (
            <FoodImage
              url={foodImage}
              alt={foodName}
              className="w-full h-full object-cover"
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-muted-foreground" />
                </div>
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Utensils className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Dynamic line + action */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed">{line}</p>
          <Link
            to={timelineLink}
            className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-olo hover:underline"
          >
            See how it happened <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}