import { useState, useRef, useCallback, useEffect, useId } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Sticky offset sits flush below the app's fixed mobile header (3.5rem +
// safe-area, no gap) and 1rem below the viewport top on desktop (no fixed
// top nav at lg+). scroll-mt mirrors the sticky top so collapse
// scrollIntoView and anchor navigation land the header exactly where it
// sticks — never hidden under the nav or a stuck header above it.
// Sections above the sticky tab bar stick just below the navbar.
const STICKY_TOP_NAV = 'top-[calc(3.5rem+env(safe-area-inset-top))] lg:top-4';
const SCROLL_MT_NAV = 'scroll-mt-[calc(3.5rem+env(safe-area-inset-top))] lg:scroll-mt-4';
// Sections inside the tab content stick below the navbar AND the sticky tab
// bar (navbar 3.5rem + tab bar ~3rem + 0.5rem gap = 7rem mobile; 2.5rem +
// 3rem + 0.5rem = 6rem desktop) so headers never hide behind the bar.
const STICKY_TOP_TAB = 'top-[calc(7rem+env(safe-area-inset-top))] lg:top-24';
const SCROLL_MT_TAB = 'scroll-mt-[calc(7rem+env(safe-area-inset-top))] lg:scroll-mt-24';

export default function DashboardSection({ icon: Icon, title, summary, children, defaultOpen = false, belowTabBar = false }) {
  const STICKY_TOP = belowTabBar ? STICKY_TOP_TAB : STICKY_TOP_NAV;
  const SCROLL_MT = belowTabBar ? SCROLL_MT_TAB : SCROLL_MT_NAV;
  const [open, setOpen] = useState(defaultOpen);
  const [stuck, setStuck] = useState(false);
  const [hasOpened, setHasOpened] = useState(defaultOpen);
  const headerRef = useRef(null);
  const sentinelRef = useRef(null);
  const panelId = useId();

  // --- Stuck-state detection (sentinel + IntersectionObserver) ---
  // A 1px sentinel sits just above the sticky header. When it scrolls above
  // the sticky line (rootMargin = -stickyTop), the header is pinned → stuck.
  useEffect(() => {
    if (!open) { setStuck(false); return; }
    const sentinel = sentinelRef.current;
    const header = headerRef.current;
    if (!sentinel || !header) return;
    const stickyTopPx = parseFloat(window.getComputedStyle(header).top) || 0;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: `${-stickyTopPx - 1}px 0px 0px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open]);

  const scrollToHeader = useCallback(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      headerRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }, []);

  const collapse = useCallback(() => {
    setOpen(false);
    scrollToHeader();
  }, [scrollToHeader]);

  const toggle = () => {
    if (open) {
      collapse();
    } else if (!hasOpened) {
      // First open: mount grid at 0fr, then rAF to 1fr so it animates.
      setHasOpened(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    } else {
      setOpen(true);
    }
  };

  // --- Keyboard navigation (WAI-ARIA accordion pattern) ---
  const onKeyDown = useCallback((e) => {
    const headers = Array.from(document.querySelectorAll('[data-section-header]'));
    const currentIndex = headers.indexOf(headerRef.current);
    if (currentIndex === -1) return;
    let targetIndex = null;
    if (e.key === 'ArrowDown') targetIndex = Math.min(currentIndex + 1, headers.length - 1);
    else if (e.key === 'ArrowUp') targetIndex = Math.max(currentIndex - 1, 0);
    else if (e.key === 'Home') targetIndex = 0;
    else if (e.key === 'End') targetIndex = headers.length - 1;
    else return;
    e.preventDefault();
    headers[targetIndex]?.focus();
  }, []);

  return (
    <div className={`rounded-2xl border border-border bg-card frost-edge ${SCROLL_MT}`}>
      {/* Sentinel — 1px div above the sticky header for stuck detection */}
      {open && <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />}
      <button
        ref={headerRef}
        type="button"
        data-section-header
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onKeyDown={onKeyDown}
        className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-[background-color,box-shadow,border-radius] duration-150 ease-out min-h-[56px] ${stuck ? 'rounded-2xl' : open ? 'rounded-t-2xl' : 'rounded-2xl'} ${SCROLL_MT} ${open ? `sticky ${STICKY_TOP} z-20` : ''} ${open ? 'bg-card/95 backdrop-blur-md' : 'bg-card'} ${stuck ? 'shadow-lg' : ''}`}
      >
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-olo" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-heading font-600 text-sm">{title}</p>
          {summary && (
            <p className="text-xs text-muted-foreground truncate overflow-hidden">
              {summary}
            </p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-standard ease-premium motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>
      {/* Content panel — CSS grid height animation (0fr ↔ 1fr) */}
      {hasOpened && (
        <div
          id={panelId}
          aria-hidden={!open}
          className={`grid transition-[grid-template-rows] duration-standard ease-premium motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden rounded-b-2xl min-h-0">
            <div className="px-4 pb-4 pt-1 space-y-4">
              {children}
              <button
                type="button"
                onClick={collapse}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-olo hover:bg-muted/30 rounded-xl transition-colors min-h-[44px]"
              >
                <ChevronUp className="w-4 h-4" /> Show less
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}