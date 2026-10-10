import { Lock } from 'lucide-react';

// A broad badge collection across whiteness, health, streaks, volume, rank and
// journey milestones. More badges = more frequent "just-one-more" unlocks
// (Duolingo/Finch lesson: many small collectibles keep the collection loop
// alive). The grid is a horizontal scroller so it never overflows the page.
const BADGES = [
  { id: 'first_scan', icon: '🎯', label: 'First Scan', desc: 'Take your first scan', tier: 'common', check: s => s.scans >= 1 },
  { id: 'scans3', icon: '🌱', label: 'Sprout', desc: '3 scans completed', tier: 'common', check: s => s.scans >= 3 },
  { id: 'scans5', icon: '🌿', label: 'Regular', desc: '5 scans completed', tier: 'common', check: s => s.scans >= 5 },
  { id: 'streak3', icon: '🔥', label: 'On Fire', desc: '3-day streak', tier: 'rare', check: s => s.streak >= 3 },
  { id: 'score70', icon: '✨', label: 'Bright Smile', desc: 'Reach 70+ whiteness', tier: 'rare', check: s => (s.latest?.score || 0) >= 70 },
  { id: 'improve5', icon: '📈', label: 'Riser', desc: 'Improve by 5 points', tier: 'common', check: s => s.improvement >= 5 },
  { id: 'streak7', icon: '⚡', label: 'Week Warrior', desc: '7-day streak', tier: 'rare', check: s => s.streak >= 7 },
  { id: 'scans10', icon: '📸', label: 'Dedicated', desc: '10 scans completed', tier: 'rare', check: s => s.scans >= 10 },
  { id: 'score80', icon: '💫', label: 'Gleaming', desc: 'Reach 80+ whiteness', tier: 'rare', check: s => (s.latest?.score || 0) >= 80 },
  { id: 'health80', icon: '🩷', label: 'Gum Care', desc: '80+ dental health', tier: 'rare', check: s => (s.latest?.dental_health_score || 0) >= 80 },
  { id: 'improve10', icon: '📈', label: 'Climber', desc: 'Improve by 10 points', tier: 'rare', check: s => s.improvement >= 10 },
  { id: 'rank_pearl', icon: '🦪', label: 'Pearl Rank', desc: 'Reach Pearl rank', tier: 'rare', check: s => s.mmr >= 100 },
  { id: 'streak14', icon: '🔥', label: 'Fortnight Fire', desc: '14-day streak', tier: 'epic', check: s => s.streak >= 14 },
  { id: 'rank_crystal', icon: '🔮', label: 'Crystal Rank', desc: 'Reach Crystal rank', tier: 'epic', check: s => s.mmr >= 300 },
  { id: 'score85', icon: '🌟', label: 'Radiant', desc: 'Reach 85+ whiteness', tier: 'epic', check: s => (s.latest?.score || 0) >= 85 },
  { id: 'health90', icon: '💚', label: 'Healthy Gums', desc: '90+ dental health', tier: 'epic', check: s => (s.latest?.dental_health_score || 0) >= 90 },
  { id: 'improve20', icon: '🚀', label: 'Soarer', desc: 'Improve by 20 points', tier: 'epic', check: s => s.improvement >= 20 },
  { id: 'scans25', icon: '🏆', label: 'Smile Scholar', desc: '25 scans completed', tier: 'epic', check: s => s.scans >= 25 },
  { id: 'rank_sapphire', icon: '🔷', label: 'Sapphire Rank', desc: 'Reach Sapphire rank', tier: 'epic', check: s => s.mmr >= 600 },
  { id: 'streak30', icon: '💎', label: 'Unbreakable', desc: '30-day streak', tier: 'legendary', check: s => s.streak >= 30 },
  { id: 'score95', icon: '💠', label: 'Diamond Smile', desc: 'Reach 95+ whiteness', tier: 'legendary', check: s => (s.latest?.score || 0) >= 95 },
  { id: 'health95', icon: '💎', label: 'Pristine Gums', desc: '95+ dental health', tier: 'legendary', check: s => (s.latest?.dental_health_score || 0) >= 95 },
  { id: 'rank_emerald', icon: '💚', label: 'Emerald Rank', desc: 'Reach Emerald rank', tier: 'epic', check: s => s.mmr >= 1000 },
  { id: 'streak60', icon: '🌋', label: 'Eternal Flame', desc: '60-day streak', tier: 'legendary', check: s => s.streak >= 60 },
  { id: 'scans50', icon: '👑', label: 'Smile Legend', desc: '50 scans completed', tier: 'legendary', check: s => s.scans >= 50 },
  { id: 'rank_aurora', icon: '🌌', label: 'Aurora Rank', desc: 'Reach Aurora rank', tier: 'legendary', check: s => s.mmr >= 1500 },
  { id: 'rank_diamond', icon: '💠', label: 'Diamond Rank', desc: 'Reach Diamond rank', tier: 'legendary', check: s => s.mmr >= 2200 },
  { id: 'rank_celestial', icon: '✨', label: 'Celestial', desc: 'Reach Celestial rank', tier: 'legendary', check: s => s.mmr >= 3000 },
];

const TIER_STYLES = {
  common: { glow: 'shadow-md shadow-slate-400/30', ring: 'ring-slate-300', bg: 'from-slate-100 to-slate-200', text: 'text-slate-600' },
  rare: { glow: 'shadow-lg shadow-blue-400/40', ring: 'ring-blue-300', bg: 'from-blue-50 to-blue-100', text: 'text-blue-600' },
  epic: { glow: 'shadow-lg shadow-purple-400/40', ring: 'ring-purple-300', bg: 'from-purple-50 to-purple-100', text: 'text-purple-600' },
  legendary: { glow: 'shadow-xl shadow-amber-400/50', ring: 'ring-amber-300', bg: 'from-amber-50 to-amber-100', text: 'text-amber-600' },
};

export default function BadgeCollection({ stats }) {
  const earned = BADGES.filter(b => b.check(stats));
  const locked = BADGES.filter(b => !b.check(stats));

  const Card = ({ badge, locked }) => {
    const style = TIER_STYLES[badge.tier];
    return (
      <div
        title={`${badge.label} — ${badge.desc}`}
        className={`relative flex-shrink-0 w-20 sm:w-24 p-3 rounded-2xl text-center ${
          locked
            ? 'bg-muted/40 ring-1 ring-border opacity-50'
            : `bg-gradient-to-br ${style.bg} ring-1 ${style.ring} ${style.glow}`
        }`}
      >
        <div className={`text-2xl sm:text-3xl mb-1 ${locked ? 'grayscale' : ''}`}>{badge.icon}</div>
        <p className={`text-[10px] sm:text-xs font-semibold truncate ${locked ? 'text-muted-foreground' : style.text}`}>{badge.label}</p>
        {locked && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-muted-foreground" />}
      </div>
    );
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-600 text-lg">Badges</h3>
        <span className="text-sm text-muted-foreground">{earned.length}/{BADGES.length} unlocked</span>
      </div>

      {earned.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Scan to start unlocking badges!</p>
      ) : (
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pt-2 pb-3 -mx-1 px-1">
          {earned.map(badge => <Card key={badge.id} badge={badge} locked={false} />)}
          {locked.map(badge => <Card key={badge.id} badge={badge} locked />)}
        </div>
      )}
    </div>
  );
}