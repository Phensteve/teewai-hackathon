import { Smile, AlertCircle, Coffee } from 'lucide-react';
import ToothMap from '@/components/ToothMap';
import TeethMockup3D from '@/components/TeethMockup3D';

export default function SmileTab({ scan, mockupView, setMockupView, mockupTeeth }) {
  return (
    <>
      {/* Tooth-by-tooth analysis */}
      <ToothMap scan={scan} />

      {/* 3D teeth mockup — approximates the user's arch from this scan */}
      {scan.tooth_analysis?.length > 0 && (
        <div className="mb-4 p-5 sm:p-6 rounded-3xl border border-border bg-card">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Smile className="w-5 h-5 text-olo" />
              <h2 className="font-heading font-600 text-xl">Your smile in 3D</h2>
            </div>
            <div className="flex bg-muted/50 rounded-xl p-1">
              <button
                onClick={() => setMockupView('health')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mockupView === 'health' ? 'bg-card text-olo shadow-sm' : 'text-muted-foreground'}`}
              >Health</button>
              <button
                onClick={() => setMockupView('shade')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mockupView === 'shade' ? 'bg-card text-olo shadow-sm' : 'text-muted-foreground'}`}
              >Shade</button>
            </div>
          </div>
          <div className="relative w-full h-[340px] rounded-2xl bg-muted/30 dark:bg-muted/20 overflow-hidden">
            <TeethMockup3D key={scan.id + mockupView} teeth={mockupTeeth} view={mockupView} />
          </div>
          <p className="text-[11px] text-warning flex items-start gap-1.5 mt-2">
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            This 3D mockup approximates your teeth from a single photo — it is a visual aid, not an accurate model. Drag to rotate.
          </p>
        </div>
      )}

      {/* Smile zone + stain types */}
      {(scan.smile_zone_score != null || scan.stain_types?.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {scan.smile_zone_score != null && (
            <div className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Smile className="w-4 h-4 text-olo" />
                <h3 className="font-heading font-600 text-sm">Smile zone score</h3>
              </div>
              <p className="text-3xl font-heading font-700 text-olo">{scan.smile_zone_score}</p>
              <p className="text-xs text-muted-foreground mt-1">Front 6 teeth · {scan.smile_zone_shade || '—'}</p>
            </div>
          )}
          {scan.stain_types?.length > 0 && (
            <div className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Coffee className="w-4 h-4 text-olo" />
                <h3 className="font-heading font-600 text-sm">Stain sources</h3>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {scan.stain_types.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-olo/10 text-olo text-xs font-medium capitalize">{s.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stains detail */}
      {scan.stains_detected?.length > 0 && (
        <div className="mb-4">
          <h2 className="font-heading font-600 text-xl mb-3">Stained areas</h2>
          <div className="flex flex-wrap gap-2">
            {scan.stains_detected.map((s, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-olo/10 text-olo text-sm font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}