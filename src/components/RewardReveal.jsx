import { useEffect, useState } from 'react';
import { playReward, playJackpot, playClaim } from '@/lib/sounds';
import { RARITIES } from '@/lib/gamification';

// Variable Ratio Reinforcement reward reveal — the "chase state" moment.
// Unpredictable reward drops after scans keep the brain craving more.
export default function RewardReveal({ reward, onClose }) {
  const [phase, setPhase] = useState('shimmer'); // shimmer -> reveal -> done

  useEffect(() => {
    if (!reward) return;
    const t1 = setTimeout(() => {
      setPhase('reveal');
      if (reward.key === 'jackpot') playJackpot();
      else playReward(reward.key);
    }, 800);
    return () => clearTimeout(t1);
  }, [reward]);

  if (!reward) return null;

  const isJackpot = reward.key === 'jackpot';

  return (
    <div
      className="fixed left-0 right-0 top-[calc(3.5rem+env(safe-area-inset-top))] bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:top-14 lg:bottom-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm text-center px-6"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'shimmer' && (
          <div className="w-24 h-24 mx-auto rounded-full bg-olo/20 animate-pulse-glow flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-olo/40 animate-ping" />
          </div>
        )}
        {phase === 'reveal' && (
          <div className="animate-fade-up">
            <div
              className="w-28 h-28 mx-auto rounded-full flex items-center justify-center text-6xl mb-5 relative"
              style={{
                background: `radial-gradient(circle, ${reward.color}, transparent 70%)`,
                boxShadow: `0 0 80px -10px ${reward.color}`,
              }}
            >
              <span className="animate-float">{reward.icon}</span>
              {isJackpot && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-olo animate-ping" />
                  <div className="absolute -inset-4 rounded-full border border-olo/30 animate-pulse-glow" />
                </>
              )}
            </div>
            <p className="text-xs text-white/50 uppercase tracking-[0.2em] mb-1">Reward drop</p>
            <h2
              className="font-heading font-800 text-3xl mb-2"
              style={{ color: reward.color, textShadow: `0 0 30px ${reward.color}` }}
            >
              {reward.label}
            </h2>
            <p className="text-white/70 text-sm mb-1">+{reward.xp} XP earned</p>
            {isJackpot && (
              <p className="text-olo text-sm font-medium mb-1 animate-pulse">You hit the jackpot! 🎉</p>
            )}
            {reward.key === 'charm' && (
              <p className="text-olo-glow text-sm font-medium mb-1">A new lucky charm for your collection</p>
            )}
            {reward.trait && (
              <div className="mt-4 mb-2 p-3 rounded-xl glass flex items-center gap-3 text-left">
                <span className="text-3xl">{reward.trait.rarityIcon}</span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Secret Smile Trait</p>
                  <p className="font-heading font-700 text-base" style={{ color: reward.trait.rarityColor }}>
                    {reward.trait.label}
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">{reward.trait.desc}</p>
                  <p className="text-[10px] mt-1" style={{ color: reward.trait.rarityColor }}>
                    {reward.trait.rarityLabel} rarity
                  </p>
                </div>
              </div>
            )}
            <p className="text-white/40 text-xs mt-4 mb-6">Scan again for another chance at a reward</p>
            <button
              onClick={() => { playClaim(); onClose(); }}
              className="bg-olo text-white font-semibold px-8 py-3 rounded-xl hover:scale-105 transition-transform olo-glow"
            >
              Claim reward
            </button>
          </div>
        )}
      </div>
    </div>
  );
}