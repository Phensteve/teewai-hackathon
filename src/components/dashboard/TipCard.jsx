import { useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import TipChart from './TipChart';
import TipIllustration from './TipIllustration';

// Accordion tip card. Collapsed = compact row/strip. Expanded = elevated card
// with body, mini chart, and themed illustration. Smooth measured-height
// transition (framer-motion height:auto). Only one expanded at a time (parent
// manages expandedId). Reduced-motion: instant. Scrolls into view on expand
// without yanking (block: 'nearest').

const CATEGORY_ICON = {
  info: '💡',
  lifestyle: '🪥',
};

export default function TipCard({ tip, expanded, onToggle, isolate }) {
  const cardRef = useRef(null);
  const reduced = useReducedMotion();
  const isOpen = expanded;

  // Scroll the expanded card into view if partially off-screen, without
  // yanking the page. block: 'nearest' only scrolls the minimum needed.
  useEffect(() => {
    if (isOpen && cardRef.current) {
      const t = setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
      }, reduced ? 0 : 260);
      return () => clearTimeout(t);
    }
  }, [isOpen, reduced]);

  const transition = reduced ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] };

  return (
    <div
      ref={cardRef}
      className={`mb-2.5 rounded-2xl border transition-all duration-200 ${
        isOpen
          ? 'bg-card border-olo/30 shadow-2 scale-[1.01]'
          : isolate
            ? 'bg-card border-olo/40'
            : 'bg-card/60 border-border hover:border-olo/25 hover:bg-card'
      }`}
    >
      {/* Header — click to toggle. Compact row in both states. */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3.5 text-left"
        aria-expanded={isOpen}
        aria-controls={`tip-body-${tip.id}`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
          isOpen ? 'bg-olo/15' : 'bg-muted'
        }`}>
          <span className="text-base leading-none">{CATEGORY_ICON[tip.category] || '💡'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-heading font-600 truncate ${isOpen ? 'text-olo' : 'text-foreground'}`}>
              {tip.title}
            </p>
            {isolate && !isOpen && <span className="text-[10px] font-semibold text-olo bg-olo/15 px-1.5 py-0.5 rounded-full flex-shrink-0">Verified</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{tip.teaser}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expandable body — measured height animation */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            id={`tip-body-${tip.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-3.5 pb-4 pt-0">
              {tip.body && (
                <p className="text-sm text-foreground/90 leading-relaxed mb-1">{tip.body}</p>
              )}
              <TipChart chartType={tip.chart_type} chartLabel={tip.chart_label} />
              <TipIllustration type={tip.illustration} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}