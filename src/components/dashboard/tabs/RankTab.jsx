import MmrRank from '@/components/MmrRank';
import MmrExplainer from '@/components/MmrExplainer';
import SocialLeaderboard from '@/components/SocialLeaderboard';
import MilestoneTracker from '@/components/MilestoneTracker';
import InstagramShareCard from '@/components/InstagramShareCard';

export default function RankTab({ mmr, peakMmr, peakRank, progress, scans, me, stats }) {
  return (
    <div className="space-y-5">
      <MmrRank mmr={mmr} peakMmr={peakMmr} peakRank={peakRank} />
      <MmrExplainer mmr={mmr} />
      <SocialLeaderboard mmr={mmr} scans={scans} />
      <MilestoneTracker stats={stats} earned={progress?.milestones_earned || []} />
      <InstagramShareCard
        mmr={mmr}
        milestone={(progress?.milestones_earned || []).slice(-1)[0] || null}
        userName={me?.username || me?.display_name}
      />
    </div>
  );
}