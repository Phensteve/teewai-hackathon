import { Brush } from 'lucide-react';
import { LIFESTYLE_TIPS, getDailyTip } from '@/lib/dailyTips';
import DailyTipCard from './DailyTipCard';

// Bottom-of-dashboard card: rotates through dental lifestyle tips daily
// (brushing, flossing, tongue cleaning, etc.). Same visual format as the
// informational tip card at the top.
export default function LifestyleTipCard({ userId }) {
  const tip = getDailyTip(LIFESTYLE_TIPS, 3);
  return <DailyTipCard tip={tip} userId={userId} icon={Brush} />;
}