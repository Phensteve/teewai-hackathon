import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flower, Shield, Check, Clock, Leaf, Award, X, Camera,
} from 'lucide-react';
import { formatDuration } from '@/lib/bloom';

import BloomEstimatePanel from './BloomEstimatePanel';
import CareIllustration from './CareIllustration';

// Bloom Harvest Sheet — the care-logging surface the bloom cube opens.
// The user logs a brush or a glass of water here; that action creates a
// stain_log (which feeds the color-coded habit extrapolation) and harvests
// the remineralization bonus if the bloom is ripe.
//
// "Don't show this animation again" hides ONLY the guide pointer (BloomGuide),
// not the bloom box itself — the bloom box always stays visible so the user
// can always log care.

const SPRING = { type: 'spring', stiffness: 320, damping: 30 };

export default function BloomHarvestSheet({
  open, onClose, status, timing, shields,
  onHarvest, onUseShield, onScan, estimate,
}) {
  const [harvesting, setHarvesting] = useState(false);
  const [harvestedAction, setHarvestedAction] = useState(null);

  if (!open) return null;

  const ripe = status === 'ripe';
  const ripening = status === 'ripening';
  const faded = status === 'faded';
  const finalHour = ripe && timing?.finalHour;

  const accent = finalHour ? 'warning' : ripe ? 'champagne' : 'olo';
  const ringStroke =
    finalHour ? 'hsl(var(--warning))' : ripe ? 'hsl(var(--champagne))' : 'hsl(var(--olo))';

  const handleHarvest = (action) => {
    if (harvesting) return;
    setHarvesting(true);
    setHarvestedAction(action);
    setTimeout(() => {
      onHarvest?.(action);
      onClose();
    }, 900);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[10010] flex items-end sm:items-center justify-center bg-olo-deep/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.98 }}
          transition={SPRING}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] rounded-3xl border border-border bg-card frost-edge shadow-3xl overflow-y-auto"
        >
          {/* Header band — bloom status */}
          <div
            className="relative px-5 pt-6 pb-5 text-center overflow-hidden"
            style={{
              background: `radial-gradient(circle at 50% 0%, hsl(var(--${accent}) / 0.22), transparent 70%)`,
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <BloomAnimation status={status} stroke={ringStroke} />

            <h2 className="font-heading font-700 text-xl mt-3">
              {faded
                ? 'Your bloom faded'
                : ripe
                  ? finalHour ? 'Bloom about to fade' : 'Your bloom is ripe'
                  : 'Bloom is ripening'}
            </h2>
            <p className="text-caption text-muted-foreground mt-1 max-w-[16rem] mx-auto">
              {faded
                ? 'The remineralization window closed. Scan again to grow a new bloom.'
                : ripe
                  ? 'Log a quick care action to harvest the bonus and lock it in.'
                  : 'Your teeth are in a receptive window — come back to harvest soon.'}
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-2 text-caption tabular-nums">
              <Clock className={`w-3.5 h-3.5 ${finalHour ? 'text-warning' : 'text-muted-foreground'}`} />
              <span className={finalHour ? 'text-warning font-semibold' : 'text-muted-foreground'}>
                {faded
                  ? 'Faded'
                  : ripe
                    ? `Fades in ${formatDuration(timing?.remainingMs || 0)}`
                    : `Ripe in ${formatDuration(timing?.remainingMs || 0)}`}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 pb-5 pt-1">
            {harvesting ? (
              <HarvestCelebration action={harvestedAction} ripe={ripe} />
            ) : faded ? (
              <button
                onClick={onScan}
                className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white text-sm font-semibold py-3 rounded-xl active:scale-95 transition-transform"
              >
                <Camera className="w-4 h-4" /> Scan to grow a new bloom
              </button>
            ) : (
              <>
                {/* Color-coded habit extrapolation */}
                <BloomEstimatePanel estimate={estimate} />

                {/* Care-logging buttons with illustrations */}
                <div className="flex gap-2.5 mt-3">
                  <button
                    onClick={() => handleHarvest('brush')}
                    className="flex-1 inline-flex flex-col items-center justify-center gap-1 bg-olo text-white text-sm font-semibold py-3.5 rounded-2xl active:scale-95 transition-transform"
                  >
                    <CareIllustration action="brush" className="w-8 h-8 text-white" />
                    <span>Brushed</span>
                  </button>
                  <button
                    onClick={() => handleHarvest('water')}
                    className="flex-1 inline-flex flex-col items-center justify-center gap-1 bg-olo/10 border border-olo/20 text-olo text-sm font-semibold py-3.5 rounded-2xl active:scale-95 transition-transform"
                  >
                    <CareIllustration action="water" className="w-8 h-8 text-olo" />
                    <span>Water</span>
                  </button>
                </div>

                {!ripe && (
                  <p className="text-center text-[11px] text-muted-foreground mt-2.5">
                    {ripening ? 'Log care now to update your estimate. Harvest unlocks when the bloom ripens.' : 'Come back soon to harvest.'}
                  </p>
                )}

                {finalHour && (
                  <div className="mt-3">
                    {shields > 0 ? (
                      <button
                        onClick={onUseShield}
                        className="w-full inline-flex items-center justify-center gap-2 border border-olo/30 bg-olo/5 text-olo text-sm font-semibold py-2.5 rounded-xl hover:bg-olo/10 transition-colors"
                      >
                        <Shield className="w-4 h-4" /> Use a Streak Shield to save it
                        <span className="text-muted-foreground font-normal">({shields} left)</span>
                      </button>
                    ) : (
                      <p className="text-center text-label text-muted-foreground">
                        No shields left — earn one with a 3-day streak.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Animated bloom flower — grows/pulses for ripe, sprouts for ripening, wilts for faded.
function BloomAnimation({ status, stroke }) {
  const ripe = status === 'ripe';
  const ripening = status === 'ripening';
  const faded = status === 'faded';

  return (
    <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
      {ripe && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${stroke}33, transparent 70%)` }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <motion.div
        animate={
          ripe
            ? { scale: [1, 1.08, 1], rotate: [0, 3, 0] }
            : ripening
              ? { scale: [0.9, 1, 0.9], y: [0, -2, 0] }
              : { rotate: [0, -8, 0], y: [0, 3, 0] }
        }
        transition={{ duration: ripe ? 2.4 : 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {faded ? (
          <Leaf className="w-12 h-12 text-muted-foreground/60" style={{ transform: 'rotate(20deg)' }} />
        ) : ripe ? (
          <Flower className="w-12 h-12" style={{ color: stroke }} />
        ) : (
          <Flower className="w-10 h-10 text-olo/70" />
        )}
      </motion.div>
      {ripe && (
        <motion.span
          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background"
          style={{ background: stroke }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}

// Brief celebration when a care action is logged.
function HarvestCelebration({ action, ripe }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-4"
    >
      <motion.div
        initial={{ scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
        className="w-14 h-14 rounded-2xl bg-champagne/20 border border-champagne/50 flex items-center justify-center"
      >
        <Award className="w-7 h-7 text-champagne" />
      </motion.div>
      <p className="font-heading font-600 text-base mt-2.5">
        {action === 'brush' ? 'Brushed!' : 'Water logged!'}
      </p>
      <p className="text-caption text-muted-foreground mt-0.5">
        {ripe ? 'Remineralization bonus harvested.' : 'Your shade estimate is updated.'}
      </p>
    </motion.div>
  );
}