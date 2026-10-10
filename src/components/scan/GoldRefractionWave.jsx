import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Gold refraction wave — the quiet-luxury celebration. Replaces confetti with
// a smooth radial champagne-gold wave that expands from center. Physics-spring
// (stiffness 380, damping 34 — no overshoot) per the design spec.
//
// Event-driven: listens for the 'teewai:gold-refraction' custom event
// dispatched by fireGoldRefraction() in scanFlow.js, so it can be triggered
// imperatively from the gamification flow. On milestones the wave is fuller
// (more rings); on regular scans it's a subtle single bloom.
//
// Champagne gold is reserved ONLY for milestones/celebrations — never used
// for routine UI accents.

const SPRING = { type: 'spring', stiffness: 380, damping: 34 };

export default function GoldRefractionWave() {
  const [active, setActive] = useState(false);
  const [milestone, setMilestone] = useState(false);

  useEffect(() => {
    let timer;
    const handler = (e) => {
      setMilestone(!!e?.detail?.milestone);
      setActive(true);
      clearTimeout(timer);
      timer = setTimeout(() => setActive(false), 1500);
    };
    window.addEventListener('teewai:gold-refraction', handler);
    return () => {
      window.removeEventListener('teewai:gold-refraction', handler);
      clearTimeout(timer);
    };
  }, []);

  const ringCount = milestone ? 4 : 2;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center"
          aria-hidden="true"
        >
          {Array.from({ length: ringCount }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 12, opacity: 0 }}
              transition={{
                ...SPRING,
                delay: i * 0.12,
                opacity: { duration: 1.3, delay: i * 0.12, ease: 'easeOut' },
              }}
              className="absolute rounded-full"
              style={{
                width: 100,
                height: 100,
                border: `2px solid hsl(var(--champagne) / ${0.7 - i * 0.12})`,
                boxShadow: `0 0 50px hsl(var(--champagne) / 0.45)`,
              }}
            />
          ))}
          {/* Center bloom */}
          <motion.div
            initial={{ scale: 0, opacity: 0.85 }}
            animate={{ scale: milestone ? 4.5 : 2.8, opacity: 0 }}
            transition={{ ...SPRING, opacity: { duration: 0.9, ease: 'easeOut' } }}
            className="absolute rounded-full"
            style={{
              width: 70,
              height: 70,
              background: 'radial-gradient(circle, hsl(var(--champagne) / 0.8), transparent 70%)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}