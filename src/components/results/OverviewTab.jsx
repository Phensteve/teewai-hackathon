import { AlertCircle, TrendingUp, Sun } from 'lucide-react';
import VitaShadeScale from '@/components/VitaShadeScale';
import FullScanGallery from '@/components/FullScanGallery';
import StainAnalysisCard from '@/components/StainAnalysisCard';

// The dual whiteness + health score circles used to live here, but they've
// been promoted to a compact always-visible score hero at the top of the
// Results page — so users see their numbers immediately, not after a 400px
// photo. This tab now shows the supporting detail: AI feedback, forecast,
// VITA shade ladder, and quick metrics.
export default function OverviewTab({ scan, forecast }) {
  return (
    <>
      {/* Full scan: all 5 angle photos */}
      {scan.scan_type === 'full' && scan.image_urls?.length > 0 && (
        <FullScanGallery imageUrls={scan.image_urls} />
      )}

      {/* Smile forecast — visual progress from current to potential */}
      <div className="mb-4 p-5 rounded-2xl border border-olo/30 bg-gradient-to-br from-olo/8 to-card relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-olo/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-600 text-base">Smile forecast</h3>
            <p className="text-sm text-muted-foreground">
              Follow your plan for {scan.weeks_to_potential || 4} weeks and your whiteness could reach <span className="text-olo font-semibold">{scan.whitening_potential_score || forecast}</span>{scan.whitening_potential_shade ? <span> ({scan.whitening_potential_shade})</span> : null}. You're only <span className="text-olo font-semibold">{Math.max(0, (scan.whitening_potential_score || forecast) - (scan.score || 0))}</span> points away!
            </p>
          </div>
        </div>
        {/* Visual progress bar: current → potential */}
        {scan.score != null && (scan.whitening_potential_score || forecast) != null && (
          <div className="relative">
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-olo/60 to-olo transition-all duration-1000"
                style={{ width: `${Math.max(3, Math.min(100, scan.whitening_potential_score || forecast))}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span>Now: <span className="text-olo font-semibold">{Math.round(scan.score)}</span></span>
              <span>Target: <span className="text-olo font-semibold">{Math.round(scan.whitening_potential_score || forecast)}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* VITA shade scale — current vs target on the lightest→darkest ladder */}
      <VitaShadeScale
        currentShade={scan.shade}
        currentShadeCode={scan.shade_code}
        targetShade={scan.whitening_potential_shade}
        targetShadeCode={scan.whitening_potential_shade_code}
      />

      {/* Whiteness metrics — each card has a subtle accent tint so the three
          metrics are visually distinct at a glance, not three identical white cards. */}
      {/* Compact metric row (shade already shows in the score hero above) */}
      <div className="grid grid-cols-2 divide-x divide-border rounded-2xl border border-border bg-card mb-4 py-2.5">
        <div className="flex items-center justify-center gap-2">
          <Sun className="w-4 h-4 text-warning" />
          <span className="text-label text-muted-foreground">Brightness</span>
          <span className="font-heading font-700 text-warning tabular-nums">{scan.brightness ?? '—'}</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-danger" />
          <span className="text-label text-muted-foreground">Stains</span>
          <span className="font-heading font-700 text-danger tabular-nums">{scan.stains_detected?.length || 0}</span>
        </div>
      </div>

      <StainAnalysisCard scan={scan} />
    </>
  );
}