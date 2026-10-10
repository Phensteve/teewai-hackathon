import { Images } from 'lucide-react';
import ScanImage from '@/components/ScanImage';

// Visual timeline of smile photos — taps into ownership & development drives
// without feeling like a "game feature". It's just your smile journey.
export default function SmileEvolution({ scans }) {
  if (scans.length < 2) return null;
  const chronological = [...scans].reverse();

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-4">
        <Images className="w-5 h-5 text-olo" />
        <h3 className="font-heading font-600 text-lg">Smile evolution</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth">
        {chronological.map((scan) => (
          <div key={scan.id} className="flex-shrink-0 w-20 sm:w-24">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-olo-deep aspect-square">
              <ScanImage url={scan.image_url} alt="Scan" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                <p className="text-white text-xs font-heading font-700">{scan.score ?? '—'}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1 truncate">
              {new Date(scan.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}