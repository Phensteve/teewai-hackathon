import { TrendingUp } from 'lucide-react';
import ProgressChart from '@/components/ProgressChart';
import SmileCoach from '@/components/SmileCoach';
import ToothImprovementMap from '@/components/ToothImprovementMap';
import SmileEvolution from '@/components/SmileEvolution';
import FutureSelfProjection from '@/components/FutureSelfProjection';

export default function JourneyTab({ scans, latest }) {
  return (
    <div className="space-y-5">
      {scans.length >= 1 ? (
        <>
          <ProgressChart scans={scans} />
          {scans.length >= 2 && <SmileCoach scans={scans} />}
          {scans.length >= 2 && <ToothImprovementMap scans={scans} />}
          {scans.length >= 2 && <SmileEvolution scans={scans} />}
          {latest && <FutureSelfProjection scans={scans} />}
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Take a couple of scans to see your whitening progress unfold.</p>
        </div>
      )}
    </div>
  );
}