import { Link } from 'react-router-dom';
import { Camera, Droplet, Stethoscope, ArrowRight } from 'lucide-react';

// Compact action bar — small buttons that navigate to scan pages.
// Brush/water care actions live in the Enamel Bloom card to avoid duplication.
export default function DashboardQuickActions({
  isPro,
  scansLimit,
  scansUsed,
  subscriptionReady = true,
  subscriptionLoading = false,
}) {
  return (
    <>
      {/* Compact action bar — scan teeth & scan food as small nav buttons */}
      <div className="flex gap-2 mb-2">
        <Link
          to="/scan"
          className="flex-1 flex items-center justify-center gap-1.5 bg-olo text-white font-semibold py-2.5 rounded-xl text-sm hover:scale-[1.02] transition-transform olo-glow"
        >
          <Camera className="w-4 h-4" /> Scan teeth
        </Link>
        <Link
          to="/stain-tracker"
          className="flex-1 flex items-center justify-center gap-1.5 bg-olo/10 border border-olo/20 text-olo font-semibold py-2.5 rounded-xl text-sm hover:scale-[1.02] transition-transform"
        >
          <Droplet className="w-4 h-4" /> Scan food
        </Link>
      </div>

      {/* Ask teewai — slim, obvious but non-disruptive link to the AI assistant */}
      <Link
        to="/ask-teewai"
        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-olo/20 bg-olo/5 text-olo font-medium text-sm hover:bg-olo/10 transition-colors mb-2"
      >
        <Stethoscope className="w-4 h-4 flex-shrink-0" />
        <span>Ask teewai — your AI dental assistant</span>
        <ArrowRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
      </Link>

      {/* Scan balance — compact inline text */}
      {!isPro && (
        <p className="text-center text-caption text-muted-foreground mb-4">
          {subscriptionReady
            ? `${Math.max(0, scansLimit - scansUsed)} of ${scansLimit} free scans left`
            : subscriptionLoading ? 'Balance loading…' : 'Balance unavailable'}
        </p>
      )}
      {isPro && <div className="mb-4" />}
    </>
  );
}