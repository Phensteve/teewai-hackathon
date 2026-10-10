import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import ColorWheel from './ColorWheel';
import ToothIllustrations from './ToothIllustrations';

// Centered card-style modal explaining the purple strip trick.
// Smooth 200-250ms fade/scale entrance, no bounce. Reduced-motion: instant.
// ESC and backdrop close. Keyboard operable (focus trap is lightweight:
// the modal has a close button and no other focusable elements besides content).
export default function PurpleStripExplainer({ open, onClose }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    // Focus the card for keyboard users
    setTimeout(() => cardRef.current?.focus(), 50);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="The purple strip trick explained"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className={`relative w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-2xl ${prefersReduced ? '' : 'animate-modal-scale-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="font-heading font-700 text-xl mb-3 pr-8">The purple strip trick</h2>

        {/* The science */}
        <p className="text-sm text-foreground/90 leading-relaxed mb-5">
          Violet sits opposite yellow on the color wheel. Complementary colors
          cancel each other to the eye. The purple film reflects violet and
          swallows the yellow undertones. Wipe it off and the yellow is still
          there. Same trick as purple shampoo for blonde hair. These products
          do not bleach your teeth. The effect fades as the film wears off.
        </p>

        {/* Color wheel */}
        <div className="flex justify-center mb-5">
          <ColorWheel size={200} />
        </div>

        {/* Illustrations */}
        <div className="mb-5 p-4 rounded-2xl bg-muted/30">
          <ToothIllustrations />
        </div>

        {/* Detection line */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-olo/5 border border-olo/20">
          <div className="w-7 h-7 rounded-lg bg-olo/15 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-olo">
              <circle cx="12" cy="12" r="3" />
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">
            teewai scans detect the purple cast, so your score always reflects your real smile.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-xl bg-olo text-white font-semibold text-sm hover:scale-[1.02] transition-transform olo-glow"
        >
          Got it
        </button>
      </div>
    </div>
  );
}