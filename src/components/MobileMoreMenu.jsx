import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MapPinned, History, HelpCircle, FileText, Shield, LogOut, Users, CreditCard, Globe, Compass, Palette, Calendar, Hourglass, Layers, Gift } from 'lucide-react';
import { useFamilyMembership } from '@/hooks/use-family-membership';
import { useTour } from '@/lib/tourContext';
import { hasUnreadBriefs } from '@/lib/briefData';
import { openExternal } from '@/lib/openExternal';
import { prefetchRoute } from '@/lib/routePrefetch';

// Professional mobile navigation drawer — known-good spec (Sep 14).
//
// GEOMETRY: width clamp(260px, 78vw, 320px), top below the mobile header,
// fixed 60vh height capped by viewport. Never full-width, never full-height.
//
// MOTION: transform translateX + opacity only. Enter 240ms cubic-bezier
// (0.16,1,0.3,1), exit 200ms cubic-bezier(0.4,0,1,1). Reduced-motion: instant.
//
// SCROLL LOCK: overflow:hidden on html+body. scrollbar-gutter:stable on html
// (index.css) reserves the gutter so no width shift. No position:fixed,
// no paddingRight, no scrollTo restore — the page stays put.
//
// FADES: static, always-visible CSS gradient masks. No JS scroll listener.
//
// BEHAVIOR: scrim tap closes, inside tap never closes, Escape closes, close
// button closes, route selection closes. Nav lock prevents double-routing.

const ENTER_MS = 240;
const EXIT_MS = 200;
const ENTER_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EXIT_EASE = 'cubic-bezier(0.4, 0, 1, 1)';
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Primary — daily check-in destinations
const PRIMARY_LINKS = [
  { to: '/my-scans', icon: History, label: 'My scans' },
  { to: '/briefs', icon: Calendar, label: 'Briefs', briefAware: true },
];

// Activity — progress and tracking tools
const ACTIVITY_LINKS = [
  { to: '/referrals', icon: Gift, label: 'Refer & earn' },
  { to: '/shade-tracker', icon: Palette, label: 'Shade tracker' },
  { to: '/time-machine', icon: Hourglass, label: 'Time machine' },
];

// Learn — articles, help, legal
const LEARN_LINKS = [
  { to: '/teewai-world', icon: Globe, label: 'teewai world', external: true },
  { to: '/help', icon: HelpCircle, label: 'Help center' },
  { to: '/terms', icon: FileText, label: 'Terms' },
  { to: '/privacy', icon: Shield, label: 'Privacy' },
];

export default function MobileMoreMenu({ onLogout, isDentist }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [briefPending, setBriefPending] = useState(false);
  const { pathname } = useLocation();
  const { isFamilyMember } = useFamilyMembership();
  const { start: startTour } = useTour();

  const closeTimerRef = useRef(null);
  const navLockRef = useRef(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Brief pending indicator — subtle dot on the Briefs row only
  useEffect(() => {
    const update = () => setBriefPending(hasUnreadBriefs());
    update();
    const onBriefChanged = () => update();
    window.addEventListener('brief-pending-changed', onBriefChanged);
    return () => window.removeEventListener('brief-pending-changed', onBriefChanged);
  }, []);

  // No document-level scroll lock. Setting overflow:hidden on html+body
  // changes the sticky-positioning context (the Dashboard tab bar loses
  // stickiness and jumps), removes the scrollbar, and can shift the fixed
  // navbars. Instead the scrim gets touch-action:none so touches on it
  // can't scroll the background, and the panel has overscroll-y-contain.
  // The menu is mobile-only (lg:hidden) so touch is the only input.

  // Escape to close
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted]);

  // Cleanup close timer on unmount
  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const open = useCallback(() => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setMounted(true);
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    if (prefersReducedMotion) { setMounted(false); return; }
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setMounted(false);
    }, EXIT_MS);
  }, []);

  const toggle = useCallback(() => {
    if (visible) close(); else open();
  }, [visible, open, close]);

  // Single-action navigation: lock prevents double-route under rapid taps
  const handleNav = useCallback((to, external, e) => {
    if (navLockRef.current) { e.preventDefault(); return; }
    navLockRef.current = true;
    close();
    if (external) { e.preventDefault(); openExternal(to); }
    setTimeout(() => { navLockRef.current = false; }, 400);
  }, [close]);

  const isActive = (to) => pathname === to || (to !== '/dashboard' && pathname.startsWith(to));

  // Find a Dentist lives in the bottom nav for non-family members, so it is
  // not duplicated here. Family members have Family (not Dentist) in their
  // bottom tab, so they get Find a Dentist here. Family is never shown in the
  // hamburger — non-family members don't have access to it, and family
  // members already have it in their bottom tab.
  const careLinks = isFamilyMember
    ? [{ to: '/find-dentist', icon: MapPinned, label: 'Find a Dentist' }]
    : [];

  const panelTransition = prefersReducedMotion
    ? 'none'
    : `transform ${ENTER_MS}ms ${ENTER_EASE}, opacity ${ENTER_MS}ms ${ENTER_EASE}`;
  const panelTransitionExit = prefersReducedMotion
    ? 'none'
    : `transform ${EXIT_MS}ms ${EXIT_EASE}, opacity ${EXIT_MS}ms ${EXIT_EASE}`;
  const scrimTransition = prefersReducedMotion
    ? 'none'
    : visible
      ? `opacity ${ENTER_MS}ms ${ENTER_EASE}`
      : `opacity ${EXIT_MS}ms ${EXIT_EASE}`;

  const renderLink = ({ to, icon: Icon, label, external, briefAware }) => {
    const active = isActive(to);
    return (
      <Link
        key={to}
        to={to}
        onClick={(e) => handleNav(to, external, e)}
        onMouseEnter={() => prefetchRoute(to)}
        onTouchStart={() => prefetchRoute(to)}
        className={`flex items-center gap-3 min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'text-olo bg-olo/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-olo' : 'text-muted-foreground'}`} />
        <span className="truncate">{label}</span>
        {briefAware && briefPending && (
          <span className="ml-auto w-2 h-2 rounded-full bg-olo brief-glow-dot flex-shrink-0" />
        )}
      </Link>
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-label={mounted ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mounted}
        aria-controls="mobile-nav-menu"
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
          mounted
            ? 'text-olo bg-olo/10'
            : 'text-muted-foreground hover:text-olo hover:bg-olo/10 active:bg-olo/20'
        }`}
        style={mounted ? { boxShadow: '0 0 0 1px hsl(var(--olo) / 0.25), 0 0 12px 2px hsl(var(--olo-glow) / 0.15)' } : undefined}
      >
        <Menu className="w-5 h-5" />
      </button>

      {mounted && (
        <div className="fixed inset-0 z-[1200] lg:hidden" role="presentation">
          {/* Scrim — opacity-only, fades with the panel. touch-action:none
              prevents touches on the scrim from scrolling the background. */}
          <div
            className="absolute inset-0 bg-black/40"
            style={{ opacity: visible ? 1 : 0, transition: scrimTransition, touchAction: 'none' }}
            onClick={close}
          />
          {/* Panel — bounded side sheet, transform + opacity only */}
          <div
            ref={panelRef}
            id="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            tabIndex={-1}
            className="absolute right-0 bg-card border-l border-border shadow-2xl flex flex-col user-select-none overflow-hidden rounded-l-2xl rounded-br-2xl frost-edge"
            style={{
              width: 'clamp(240px, 66vw, 290px)',
              boxSizing: 'border-box',
              top: 'calc(3.5rem + env(safe-area-inset-top))',
              height: '60vh',
              maxHeight: 'calc(100vh - 4rem - env(safe-area-inset-top))',
              minHeight: 0,
              transform: visible ? 'translateX(0)' : 'translateX(100%)',
              opacity: visible ? 1 : 0,
              transition: visible ? panelTransition : panelTransitionExit,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — heading + close button */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="flex items-center gap-2 font-heading font-700 text-base tracking-tight">
                <Layers className="w-[18px] h-[18px] text-olo" />
                Extensions
              </span>
              <button
                onClick={close}
                aria-label="Close navigation"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>

            {/* Body — the sole scrollable region. Header is the only fixed
                zone; all groups (Primary → Account) live here. */}
            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0 overflow-y-auto overflow-x-hidden sidebar-scroll overscroll-y-contain">
                <div className="flex flex-col p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
                  {/* Destinations */}
                  <p className="text-label text-muted-foreground/70 px-4 pt-2 pb-1">Destinations</p>
                  <div className="flex flex-col gap-0.5">
                    {PRIMARY_LINKS.map(renderLink)}
                    {ACTIVITY_LINKS.map(renderLink)}
                    {careLinks.map(renderLink)}
                  </div>
                  <div className="my-1.5 mx-2 border-t border-border/50" />
                  {/* Learn */}
                  <p className="text-label text-muted-foreground/70 px-4 pt-1 pb-1">Learn</p>
                  <div className="flex flex-col gap-0.5">
                    {LEARN_LINKS.map(renderLink)}
                  </div>
                  <div className="my-1.5 mx-2 border-t border-border/50" />
                  {/* Account */}
                  <p className="text-label text-muted-foreground/70 px-4 pt-1 pb-1">Account</p>
                  <div className="flex flex-col gap-0.5">
                    {renderLink({ to: '/subscription', icon: CreditCard, label: 'Plan' })}
                    <button
                      onClick={() => { close(); startTour(); }}
                      className="flex items-center gap-3 min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-olo hover:bg-olo/5 transition-colors"
                    >
                      <Compass className="w-[18px] h-[18px] flex-shrink-0" />
                      <span>Take the tour</span>
                    </button>
                    <button
                      onClick={() => { close(); onLogout?.(); }}
                      className="flex items-center gap-3 min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              </div>
              {/* Static fade masks — always visible, CSS-only, no JS listener */}
              <div
                className="absolute top-0 inset-x-0 h-4 pointer-events-none z-10"
                style={{ background: 'linear-gradient(to bottom, hsl(var(--card)), transparent)' }}
              />
              <div
                className="absolute bottom-0 inset-x-0 h-4 pointer-events-none z-10"
                style={{ background: 'linear-gradient(to top, hsl(var(--card)), transparent)' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}