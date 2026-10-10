import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';

// Page transition — opacity-only fade, no transform.
//
// Lives INSIDE the shell (AppShell / DentistShell) wrapping <Outlet/>, so the
// top bar, bottom nav and desktop sidebar stay mounted and never animate.
//
// A sliding transform creates a containing block for the animation duration
// which can glitch fixed-position children (maps, sheets) and visually slide
// an empty container while the page's data re-fetches after remount.
// Opacity-only fade avoids both issues and looks clean even when content is
// still loading — no "sliding empty page" jank.
const FULL_BLEED = new Set(['/find-dentist']);

export default function PageTransition({ children }) {
  const location = useLocation();
  const reduced = useReducedMotion();
  const skipRef = useRef(true);

  useEffect(() => {
    skipRef.current = false;
  }, []);

  // No DOM wrapper for fixed full-bleed pages or first load.
  if (skipRef.current || FULL_BLEED.has(location.pathname)) return <>{children}</>;

  // Keyed div triggers remount on path change; opacity-only animation.
  // Reduced motion: keyed div without animation class (instant swap).
  return (
    <div key={location.pathname} className={reduced ? '' : 'page-enter-fade'}>
      {children}
    </div>
  );
}