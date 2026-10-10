import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import CareIllustration from './CareIllustration';

// The "this is where you log your brush" guide animation. Shows two
// illustrations (just brushed + drank water) so the user knows the bloom box
// is their care-logging entry point. "Don't show this animation again" hides
// ONLY this guide — the bloom box itself always stays visible.
export default function BloomGuide({ hidden, onHide }) {
  const reduced = useReducedMotion();
  if (hidden) return null;

  return (
    <div className="rounded-2xl border border-olo/30 bg-card shadow-2 px-3 py-3">
      <p className="text-xs font-semibold text-foreground text-center mb-2.5">
        This is where you log your brush or water.
      </p>
      <div className="flex justify-center gap-6 mb-2">
        <div className="flex flex-col items-center gap-1">
          <CareIllustration action="brush" className="w-12 h-12 text-habit-brush" />
          <span className="text-[10px] font-medium text-muted-foreground">Just brushed</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <CareIllustration action="water" className="w-12 h-12 text-habit-water" />
          <span className="text-[10px] font-medium text-muted-foreground">Drank water</span>
        </div>
      </div>
      <label className="flex items-center justify-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
        <input
          type="checkbox"
          onChange={(e) => { if (e.target.checked) onHide?.(); }}
          className="w-4 h-4 rounded accent-primary"
        />
        Don't show this animation again
      </label>
      <motion.div
        aria-hidden="true"
        animate={reduced ? undefined : { y: [0, 4, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        className="flex justify-end pr-2 mt-2"
      >
        <ArrowDown className="w-6 h-6 text-primary" />
      </motion.div>
    </div>
  );
}