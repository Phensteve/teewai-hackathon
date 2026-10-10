import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import BloomGuide from '@/components/bloom/BloomGuide';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flower, Leaf, Award } from 'lucide-react';
import { getBloomStatus, getBloomTiming } from '@/lib/bloom';
import { playChime } from '@/lib/sounds';
import BloomHarvestSheet from './BloomHarvestSheet';
import { useHabitEstimate } from '@/hooks/use-habit-estimate';

// Enamel Bloom — rendered as a sleek, compact corner cube. It floats in the
// bottom-right corner (clear of the mobile bottom nav) so it never disrupts
// the dashboard flow. Tapping the cube expands a small popover with the full
// status, countdown, and harvest / shield actions. All bloom logic (states,
// timing, handlers) is unchanged from the inline card version.

const SPRING = { type: 'spring', stiffness: 380, damping: 34 };

// Bottom-right corner placement. On mobile it sits above the bottom nav
// (~4.5rem + safe area); on desktop it drops to the viewport corner.
const CUBE_POS = 'fixed z-[10000] bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 lg:bottom-6 lg:right-6';

export default function BloomCard({ bloom, shields = 0, onHarvest, onUseShield }) {
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [celebrated, setCelebrated] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [guideHidden, setGuideHidden] = useState(() => {
    try { return bloom?.user_id ? !!localStorage.getItem(`teewai_bloom_guide_hidden_${bloom.user_id}`) : false; } catch { return false; }
  });
  const handleGuideHide = () => {
    try { if (bloom?.user_id) localStorage.setItem(`teewai_bloom_guide_hidden_${bloom.user_id}`, '1'); } catch { /* */ }
    setGuideHidden(true);
  };
  const estimateQuery = useHabitEstimate(bloom?.user_id, bloom?.source_scan_id);
  const estimate = estimateQuery.data || null;

  useEffect(() => {
    if (!bloom) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [bloom]);

  if (!bloom) return null;
  const status = getBloomStatus(bloom, now);
  if (status === 'harvested') {
    if (celebrated) return null;
    return createPortal(<HarvestedCube bloom={bloom} onDone={() => setCelebrated(true)} className={CUBE_POS} />, document.body);
  }

  const timing = getBloomTiming(bloom, now);
  const ripe = status === 'ripe';
  const finalHour = ripe && timing.finalHour;
  const faded = status === 'faded';

  const ringStroke =
    finalHour ? 'hsl(var(--warning))' : ripe ? 'hsl(var(--champagne))' : 'hsl(var(--olo))';
  const borderClass =
    finalHour ? 'border-warning/40' : ripe ? 'border-champagne/50' : 'border-olo/25';

  return createPortal(
    <>
      <div className={CUBE_POS}>
        {!sheetOpen && !faded && !guideHidden && (
          <div className="absolute bottom-full right-0 mb-4 w-[min(18rem,calc(100vw-2rem))]">
            <BloomGuide hidden={guideHidden} onHide={handleGuideHide} />
          </div>
        )}
        <div className="relative rounded-2xl brief-glow-ring">
        <span aria-hidden="true" className="absolute -inset-2 rounded-3xl bg-olo/20 blur-lg pointer-events-none" />
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          onClick={() => setSheetOpen(true)}
          className={`relative w-14 h-14 rounded-2xl border ${borderClass} bg-card frost-edge shadow-2 flex items-center justify-center active:scale-95 transition-transform ${
            ripe ? 'animate-pulse-glow' : ''
          }`}
          style={ripe ? { animationDuration: '2.4s' } : undefined}
          aria-label={`Enamel bloom ${ripe ? 'ripe' : faded ? 'faded' : 'ripening'} — tap to log care`}
        >
          {ripe && <span className="absolute inset-0 rounded-2xl radial-olo opacity-20 pointer-events-none" />}
          <MiniRing progress={timing.progress} stroke={ringStroke} ripe={ripe} faded={faded} />
          <span
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
              finalHour ? 'bg-warning' : ripe ? 'bg-champagne' : faded ? 'bg-muted-foreground/50' : 'bg-olo'
            }`}
          />
        </motion.button>
        </div>
      </div>

      <BloomHarvestSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        status={status}
        timing={timing}
        shields={shields}
        onHarvest={onHarvest}
        onUseShield={onUseShield}
        onScan={() => { setSheetOpen(false); navigate('/scan'); }}
        estimate={estimate}
      />
    </>,
    document.body
  );
}

// One-shot gold celebration cube (champagne accent). Auto-dismisses ~2.6s.
function HarvestedCube({ bloom, onDone, className }) {
  useEffect(() => {
    playChime();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([30, 40, 60]); } catch {}
    }
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
      className={`${className} w-14 h-14 rounded-2xl border border-champagne/50 bg-card frost-edge shadow-2 flex items-center justify-center overflow-hidden relative`}
    >
      <span className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, hsl(var(--champagne) / 0.28), transparent 70%)' }} />
      <Award className="w-5 h-5 text-champagne relative z-10" />
      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-champagne border-2 border-background" />
    </motion.div>
  );
}

// Compact ripening ring for the cube face — fills toward 100% at peak ripeness.
function MiniRing({ progress, stroke, ripe, faded }) {
  const R = 18;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <div className="relative w-9 h-9">
      <svg className="w-9 h-9 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
        <circle
          cx="20" cy="20" r={R} fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {faded ? (
          <Leaf className="w-4 h-4 text-muted-foreground" />
        ) : ripe ? (
          <Flower className="w-3.5 h-3.5" style={{ color: stroke }} />
        ) : (
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: stroke }}>
            {Math.round(progress * 100)}
          </span>
        )}
      </div>
    </div>
  );
}