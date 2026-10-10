import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Gem } from 'lucide-react';
import { playReward, playClaim } from '@/lib/sounds';

// Compact inline reveal for bloom-harvest discovery drops — a small bottom
// sheet that doesn't block the care-action flow (unlike the full-screen
// RewardReveal used for food-find / stain-log drops). Auto-dismisses after
// a few seconds; the user can tap to close sooner.
export default function DiscoveryReveal({ reward, onClose }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!reward) return;
    setShow(true);
    playReward(reward.key);
    const t = setTimeout(() => handleClose(), 4500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward]);

  if (!reward) return null;

  const handleClose = () => {
    setShow(false);
    playClaim();
    onClose?.();
  };

  return createPortal(
    <div
      className={`fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transition-all duration-300 ease-premium ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card frost-edge shadow-2xl p-4 flex items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `radial-gradient(circle, ${reward.color}33, transparent 70%)`, boxShadow: `0 0 24px -4px ${reward.color}` }}
        >
          <span className="animate-float">{reward.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
            <Gem className="w-3 h-3" style={{ color: reward.color }} /> Bloom discovery
          </p>
          <p className="font-heading font-700 text-sm leading-tight" style={{ color: reward.color }}>
            {reward.label}
          </p>
          <p className="text-xs text-muted-foreground">+{reward.xp} XP · added to your Collection</p>
        </div>
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}