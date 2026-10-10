import { useState } from 'react';
import { Flag, ArrowRight, Smile, Check } from 'lucide-react';
import DashboardSection from '@/components/DashboardSection';
import BaselinePicker from '@/components/baseline/BaselinePicker';
import { computeOverallDelta, computeIdealDelta, formatBaselineDate, isFlagged, setIdealBaseline } from '@/lib/baseline';

// Dashboard: a small Baseline card with a reference type picker. Two options:
// "My scan" (existing behavior) and "Ideal smile" (generic ideal reference).
// The current one is highlighted. Collapsed by default like other cards.
export default function BaselineDashboardCard({ scans, baselineScan, baselineType, onBaselineChange, onTypeChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const onlyOneScan = scans.length <= 1;
  const baselineDate = formatBaselineDate(baselineScan?.created_date);
  const latest = scans[0];
  const latestFlagged = isFlagged(latest);

  const isIdeal = baselineType === 'ideal';

  // Delta depends on the reference type.
  const scanDelta = !isIdeal && baselineScan && latest && !latestFlagged ? computeOverallDelta(latest, baselineScan) : null;
  const idealDelta = isIdeal && latest && !latestFlagged ? computeIdealDelta(latest) : null;

  const summary = latestFlagged
    ? 'Latest scan has a color correcting product — excluded from progress'
    : isIdeal
      ? idealDelta
        ? `${idealDelta.label}${idealDelta.scoreGap != null && idealDelta.scoreGap > 0 ? ` · ${idealDelta.scoreGap} pts to go` : ''}`
        : 'Measured against the ideal smile'
      : onlyOneScan
        ? 'Your baseline is your latest scan'
        : baselineScan
          ? `Set ${baselineDate || ''} · ${scanDelta?.label || 'no change'}`
          : 'No baseline set yet';

  const handlePickIdeal = async () => {
    try {
      await setIdealBaseline();
      onTypeChange('ideal');
    } catch {}
  };

  return (
    <>
      <DashboardSection icon={Flag} title="Your baseline" summary={summary}>
        {/* Reference type picker — two options, current highlighted */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => !isIdeal && onTypeChange('scan')}
            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              !isIdeal
                ? 'border-olo bg-olo/5 text-olo'
                : 'border-border text-muted-foreground hover:border-olo/30 hover:bg-olo/5'
            }`}
          >
            <Flag className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">My scan</span>
            {!isIdeal && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
          </button>
          <button
            onClick={() => isIdeal ? onTypeChange('scan') : handlePickIdeal()}
            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              isIdeal
                ? 'border-olo bg-olo/5 text-olo'
                : 'border-border text-muted-foreground hover:border-olo/30 hover:bg-olo/5'
            }`}
          >
            <Smile className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Ideal smile</span>
            {isIdeal && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
          </button>
        </div>

        {/* Scan reference: delta + change baseline link */}
        {!isIdeal && baselineScan && !onlyOneScan && scanDelta && (
          <div className="p-4 rounded-2xl border border-border bg-muted/20 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall since baseline</span>
              <span className={`font-heading font-700 text-lg ${scanDelta.steps > 0 ? 'text-olo' : scanDelta.steps < 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                {scanDelta.label}
              </span>
            </div>
            {scanDelta.scoreDelta != null && scanDelta.scoreDelta !== 0 && (
              <p className="text-xs text-muted-foreground">
                Whiteness {scanDelta.scoreDelta > 0 ? '+' : ''}{scanDelta.scoreDelta} points since {baselineDate}
              </p>
            )}
          </div>
        )}

        {/* Ideal reference: gap to close */}
        {isIdeal && idealDelta && (
          <div className="p-4 rounded-2xl border border-border bg-muted/20 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Gap to the ideal smile</span>
              <span className={`font-heading font-700 text-lg ${idealDelta.steps > 0 ? 'text-olo' : idealDelta.steps < 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                {idealDelta.label}
              </span>
            </div>
            {idealDelta.scoreGap != null && idealDelta.scoreGap > 0 && (
              <p className="text-xs text-muted-foreground">
                {idealDelta.scoreGap} whiteness points to close
              </p>
            )}
          </div>
        )}

        {/* Change baseline link — only in scan mode */}
        {!isIdeal && !onlyOneScan && (
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-olo hover:underline"
          >
            Change baseline <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
        {!isIdeal && onlyOneScan && baselineScan && (
          <p className="text-sm text-muted-foreground">
            Take another scan to start tracking progress against your baseline.
          </p>
        )}
        {isIdeal && (
          <p className="text-sm text-muted-foreground">
            Measured against the ideal A1 shade. Switch to your own scan for a personal baseline.
          </p>
        )}
      </DashboardSection>

      {pickerOpen && (
        <BaselinePicker
          scans={scans}
          currentBaselineId={baselineScan?.id}
          onPick={(scan) => {
            onBaselineChange(scan);
            onTypeChange('scan');
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}