import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Stethoscope } from 'lucide-react';
import ScanImage from '@/components/ScanImage';

// Memoized braces-check row for the My Scans list.
const BracesScanRow = React.memo(function BracesScanRow({ scan }) {
  const s = scan;
  const date = s.created_date ? new Date(s.created_date) : null;
  return (
    <Link
      to={`/results/${s.id}`}
      className="flex items-center gap-4 p-3 rounded-2xl border border-border bg-card hover:border-olo/40 hover:bg-olo/5 transition-colors"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-olo-deep flex-shrink-0">
        {s.image_url ? (
          <ScanImage url={s.image_url} alt="braces check" className="w-full h-full object-cover" />
        ) : (
          <Stethoscope className="w-6 h-6 text-white/40 m-auto" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-heading font-700 text-lg text-olo">{s.score ?? '—'}</span>
          <span className="text-xs text-muted-foreground">alignment</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {date
            ? date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—'}
        </p>
        {s.ai_feedback && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.ai_feedback}</p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </Link>
  );
});

export default BracesScanRow;