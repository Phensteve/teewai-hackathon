// Gold refraction wave + reward reveal wrapper. The wave is the quiet-luxury
// celebration; the reveal shows the scan's gamification reward (XP, trait,
// charm drop) and navigates to results on close.
import GoldRefractionWave from '@/components/scan/GoldRefractionWave';
import RewardReveal from '@/components/RewardReveal';

export default function ScanRewards({ reward, onClose }) {
  return (
    <>
      <GoldRefractionWave />
      {reward && <RewardReveal reward={reward} onClose={onClose} />}
    </>
  );
}