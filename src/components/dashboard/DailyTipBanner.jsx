import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, ChevronRight, Clock } from 'lucide-react';
import { recordShownTip } from '@/lib/tipHistory';
import TipIllustration from '@/components/dashboard/TipIllustration';
import TipChart from '@/components/dashboard/TipChart';
import ColorWheel from '@/components/purplestrip/ColorWheel';
import ToothIllustrations from '@/components/purplestrip/ToothIllustrations';

// A single daily tip card. Click opens a sleek overlay modal with the full
// tip body. The overlay is a fixed-position layer that fades + scales in on
// top of the page WITHOUT locking scroll or touching overflow — so the
// sticky tab bar, fixed nav, and scrollbar never shift. Closing just fades
// the overlay away; the page behind it is untouched the entire time.
//
// `category` = 'health' (top) or 'advice' (bottom) — controls accent color
// and the label. `showHistoryLink` adds a "view all tips" link in the modal.

export default function DailyTipBanner({ tip, category, icon: Icon, showHistoryLink = false }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (tip) recordShownTip(tip, category);
  }, [tip?.id, category]);

  // Escape to close — no scroll lock, no layout effect.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!tip) return null;

  const isHealth = category === 'health';
  const label = isHealth ? 'Dental health' : 'Daily advice';

  // The purple strip tip gets the rich explainer treatment: color wheel +
  // scratch illustrations + the complementary-color science. Other tips use
  // the generic TipIllustration / TipChart.
  const isPurpleStrip = tip.title && /purple strip/i.test(tip.title);

  // Asymmetric, premium "settle": the backdrop leads, the card arrives
  // gracefully with a gentle overshoot + blur-in, then leaves promptly.
  // Symmetric in/out is what made it feel abrupt and disposable.
  const backdropVariants = reduced
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
        exit: { opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
      };
  const cardVariants = reduced
    ? {}
    : {
        initial: { opacity: 0, scale: 0.94, y: 14, filter: 'blur(6px)' },
        animate: {
          opacity: 1, scale: 1, y: 0, filter: 'blur(0px)',
          transition: { duration: 0.34, ease: [0.34, 1.56, 0.64, 1], delay: 0.05 },
        },
        exit: {
          opacity: 0, scale: 0.92, y: 10, filter: 'blur(4px)',
          transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
        },
      };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full mb-4 p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
          isHealth
            ? 'border-olo/25 bg-olo/5 hover:bg-olo/10'
            : 'border-warning/20 bg-warning-soft/60 hover:bg-warning-soft'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isHealth ? 'bg-olo/10' : 'bg-warning/15'
          }`}>
            <Icon className={`w-4 h-4 ${isHealth ? 'text-olo' : 'text-warning'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${
              isHealth ? 'text-olo' : 'text-warning'
            }`}>
              {label}
            </p>
            <p className="text-sm font-heading font-600 text-foreground">{tip.title}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{tip.body}</p>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              Tap to read more <ChevronRight className="w-3 h-3" />
            </p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Backdrop — fade only */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              variants={backdropVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={() => setOpen(false)}
            />
            {/* Card — scale + fade + slight rise, centered */}
            <motion.div
              className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-6 no-scrollbar"
              variants={cardVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                isHealth ? 'bg-olo/10' : 'bg-warning/15'
              }`}>
                <Icon className={`w-5 h-5 ${isHealth ? 'text-olo' : 'text-warning'}`} />
              </div>
              <h3 className="text-lg font-heading font-700 pr-8 mb-2">{tip.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{tip.body}</p>
              {isPurpleStrip ? (
                <div className="space-y-4">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    Violet sits opposite yellow on the color wheel. Complementary
                    colors cancel each other to the eye. The purple film reflects
                    violet and swallows the yellow undertones. Wipe it off and the
                    yellow is still there. Same trick as purple shampoo for blonde
                    hair. These products do not bleach your teeth. The effect fades
                    as the film wears off.
                  </p>
                  <div className="flex justify-center">
                    <ColorWheel size={200} />
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/30">
                    <ToothIllustrations />
                  </div>
                </div>
              ) : (
                <>
                  <TipIllustration type={tip.illustration} />
                  <TipChart chartType={tip.chart_type} chartLabel={tip.chart_label} />
                </>
              )}
              {showHistoryLink && (
                <Link
                  to="/tip-history"
                  onClick={() => setOpen(false)}
                  className="text-xs text-olo hover:underline flex items-center gap-1 pt-2"
                >
                  <Clock className="w-3.5 h-3.5" /> View all tips you've seen
                </Link>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}