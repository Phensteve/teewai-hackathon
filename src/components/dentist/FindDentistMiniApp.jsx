import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import PageSkeleton from '@/components/loading/PageSkeleton';
const FindDentist = lazyWithRetry(() => import('@/pages/FindDentist'));

// Telegram mini-app style full-screen overlay for the Find a Dentist map.
// Launches OVER the current screen (no app-shell navigation) so the map
// feels like a self-contained mini app — full-bleed, its own close button,
// no sidebar or bottom nav. Opened from any launcher by dispatching the
// 'teewai-open-find-dentist' window event, so the bottom-nav Dentist tab
// and the sidebar entry can both trigger it without a route change.
export default function FindDentistMiniApp() {
  const [open, setOpen] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('teewai-open-find-dentist', handler);
    return () => window.removeEventListener('teewai-open-find-dentist', handler);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[1000] bg-background"
        >
          <Suspense fallback={<PageSkeleton pagePath="/find-dentist" className="px-4 pt-safe-app" />}>
            <FindDentist embedded />
          </Suspense>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-3 z-[1100] w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md border border-border flex items-center justify-center shadow-lg hover:bg-card transition-colors"
            aria-label="Close dentist map"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}