import { useState } from 'react';
import { INFO_TIPS, getDailyTip } from '@/lib/dailyTips';
import DailyTipCard from './DailyTipCard';
import PurpleStripExplainer from '@/components/purplestrip/PurpleStripExplainer';

// Top-of-dashboard card: rotates through informational tips daily. When the
// latest scan is flagged for a color correcting product, the card overrides
// with the detection message. The purple strip tip has a "More" button that
// opens the explainer modal.
export default function InfoTipCard({ userId, latestScanFlagged }) {
  const [explainerOpen, setExplainerOpen] = useState(false);
  const tip = getDailyTip(INFO_TIPS);

  if (latestScanFlagged) {
    return (
      <>
        <DailyTipCard
          tip={{
            id: 'flagged',
            title: 'We detected a color correcting product in your latest scan',
            body: "Purple strips and serums paint your teeth, they don't whiten them. The violet film cancels yellow optically. Your shade reading is distorted, so we excluded this scan from your progress. Re-scan without the product for your true shade.",
          }}
          userId={userId}
          accent="violet"
          onMore={() => setExplainerOpen(true)}
        />
        <PurpleStripExplainer open={explainerOpen} onClose={() => setExplainerOpen(false)} />
      </>
    );
  }

  return (
    <>
      <DailyTipCard
        tip={tip}
        userId={userId}
        onMore={tip?.hasExplainer ? () => setExplainerOpen(true) : undefined}
      />
      {tip?.hasExplainer && (
        <PurpleStripExplainer open={explainerOpen} onClose={() => setExplainerOpen(false)} />
      )}
    </>
  );
}