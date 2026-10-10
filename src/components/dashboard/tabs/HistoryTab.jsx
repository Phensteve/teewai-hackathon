import ScanRow from '@/components/dashboard/ScanRow';
import TreatmentHistory from '@/components/dashboard/TreatmentHistory';

export default function HistoryTab({ scans, baselineScan }) {
  if (scans.length === 0) {
    return (
      <div className="space-y-6">
        <TreatmentHistory />
        <div className="text-center py-16 text-muted-foreground">
          No scans yet. Start your first scan!
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {scans.map((s, i) => {
          const prev = scans[i + 1];
          const isBaseline = s.id === baselineScan?.id;
          const isLatest = !isBaseline && i === 0;
          return (
            <ScanRow
              key={s.id}
              scan={s}
              prev={prev}
              isBaseline={isBaseline}
              isLatest={isLatest}
            />
          );
        })}
      </div>
      <TreatmentHistory />
    </div>
  );
}