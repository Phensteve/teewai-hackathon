// Out-of-scans paywall. Shown when the user has hit their scan limit (free,
// pack, or family-member tier). Offers a path to scan packs / unlimited.
// Now driven by the server-side scanQuota check result, which is the same
// logic that gates the actual scan consumption — so the plan page and scan
// page can never disagree on whether scans are available.
import { Camera } from 'lucide-react';

export default function ScanLimitState({
  isFamilyMember,
  familyMembership,
  scansLimit,
  quotaReason,
  onGetPack,
}) {
  const isLinkedMember = isFamilyMember;
  const memberLimit = familyMembership?.scans_limit || scansLimit || 0;

  return (
    <div className="max-w-lg mx-auto py-16">
      <div className="text-center p-6 sm:p-8 rounded-3xl border border-border bg-card frost-edge">
        <span className="icon-tool mx-auto mb-4">
          <Camera />
        </span>
        <h1 className="text-h1 mb-2">You're out of scans</h1>
        <p className="text-body text-muted-foreground mb-4">
          {isLinkedMember
            ? `You've used all ${memberLimit} of your family scans this month. Ask the plan owner to reset the counters or upgrade.`
            : quotaReason || `You've used all ${scansLimit} of your scans. Keep tracking your smile. Scan packs start at $0.99, or go unlimited for endless scans.`}
        </p>
        {!isLinkedMember && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onGetPack}
              className="bg-olo text-white font-semibold px-6 py-3 rounded-xl text-caption hover:scale-105 transition-transform olo-glow w-full sm:w-auto"
            >
              Get a scan pack
            </button>
            <button
              onClick={onGetPack}
              className="border border-olo/40 text-olo font-semibold px-6 py-3 rounded-xl text-caption hover:bg-olo/5 transition-colors w-full sm:w-auto"
            >
              Go unlimited →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}