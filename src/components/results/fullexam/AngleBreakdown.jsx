import { Camera } from 'lucide-react';
import ExamCard from './ExamCard';
import ScanImage from '@/components/ScanImage';
import { scoreTone, ANGLE_LABELS } from './examTone';

// What each of the five photos contributed to the exam.
export default function AngleBreakdown({ angles = [], imageUrls = [] }) {
  if (!angles.length) return null;
  return (
    <ExamCard icon={Camera} title="What each angle showed" subtitle="Every photo was read and cross-checked">
      <div className="space-y-2">
        {angles.map((a, i) => {
          const weak = (a.quality ?? 100) < 40;
          return (
            <div key={i} className="flex gap-3 p-2.5 rounded-xl bg-muted/40">
              {imageUrls[i] && <ScanImage url={imageUrls[i]} alt={a.angle} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-olo-deep" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-semibold">{ANGLE_LABELS[a.angle] || a.angle}</p>
                  <span className={`text-label normal-case tracking-normal ${weak ? 'text-danger' : 'text-muted-foreground'}`}>
                    {weak ? 'Hard to read' : `${a.teeth_visible?.length || 0} teeth`}
                  </span>
                </div>
                <p className="text-caption text-muted-foreground">{a.key_finding}</p>
                <p className="text-[11px] mt-0.5">
                  Health <span className={scoreTone(a.health_score).text}>{a.health_score != null ? Math.round(a.health_score) : '—'}</span> · Whiteness <span className={scoreTone(a.whiteness_score).text}>{a.whiteness_score != null ? Math.round(a.whiteness_score) : '—'}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ExamCard>
  );
}