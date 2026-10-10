import { useEffect } from 'react';

// Global scroll-lock with a refcount so nested modals don't unlock each other.
// Locks both <html> and <body> so the page behind a modal can't scroll —
// critical on mobile where Radix's default body-only lock can leak through
// the html scroll container (scrollbar-gutter: stable makes html the scroller).
//
// Compensates for the scrollbar width with padding-right so the content area
// doesn't shift when the scrollbar disappears. scrollbar-gutter: stable on
// <html> reserves the gutter while the page is scrollable, but setting
// overflow: hidden removes that reservation — the padding-right restores it.
let lockCount = 0;

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    if (lockCount === 0) {
      // Measure the scrollbar/gutter width BEFORE changing overflow.
      // With scrollbar-gutter: stable, clientWidth already excludes the
      // gutter, so innerWidth - clientWidth gives us the exact width to
      // compensate for.
      const scrollbarWidth = window.innerWidth - html.clientWidth;
      // Switch off scrollbar-gutter so it doesn't double-reserve the space
      // once we add padding-right. overflow: hidden can drop the stable
      // gutter in some browsers, which is what causes the page shift.
      html.style.scrollbarGutter = 'auto';
      if (scrollbarWidth > 0) {
        html.style.paddingRight = `${scrollbarWidth}px`;
      }
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    }
    lockCount++;
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        html.style.overflow = '';
        html.style.scrollbarGutter = '';
        html.style.paddingRight = '';
        body.style.overflow = '';
        body.style.paddingRight = '';
      }
    };
  }, [active]);
}