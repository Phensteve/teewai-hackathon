import { useState, useEffect, useRef, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Camera, CreditCard, LogOut, MapPinned, Stethoscope, Trophy, User, History, LifeBuoy, HelpCircle, Users, Newspaper, Utensils, Hourglass, Compass, Palette, Calendar, Gift } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { subscriptions } from '@/lib/insforgeDb';
import { queryClientInstance } from '@/lib/query-client';
import { profileQueryOptions } from '@/lib/profileQuery';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { setCachedSubscription } from '@/lib/subscriptionCache';
import Logo from '@/components/Logo';
import BottomNav from '@/components/BottomNav';
import ThemeToggle from '@/components/ThemeToggle';
import TextZoomControl from '@/components/TextZoomControl';
import MobileMoreMenu from '@/components/MobileMoreMenu';
import PortalSwitcher from '@/components/PortalSwitcher';
import { useAuth } from '@/lib/AuthContext';
import NotificationsBell from '@/components/NotificationsBell';
import Spinner from '@/components/Spinner';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageTransition from '@/components/PageTransition';
import { prefetchRoute, prefetchOnIdle } from '@/lib/routePrefetch';
import BriefManager from '@/components/briefs/BriefManager';
import BriefSleekAlert from '@/components/briefs/BriefSleekAlert';
import { hasUnreadBriefs, syncBriefReadStates } from '@/lib/briefData';
import { useUserMirrorSync } from '@/hooks/use-user-mirror-sync';
import { isNativeApp } from '@/lib/isNativeApp';
import { syncConsentFromServer } from '@/lib/consent';
import { TourProvider, useTour } from '@/lib/tourContext';
import TourOverlay from '@/components/TourOverlay';
import AccountExistsNotice from '@/components/auth/AccountExistsNotice';
import FindDentistMiniApp from '@/components/dentist/FindDentistMiniApp';
import PaywallOverlay from '@/components/PaywallOverlay';
import BillingExpiredScreen from '@/components/BillingExpiredScreen';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/briefs', icon: Calendar, label: 'Brief' },
  { to: '/my-scans', icon: History, label: 'My scans' },
  { to: '/stain-tracker', icon: Utensils, label: 'Stain tracker', tour: 'tour-food' },
  { to: '/shade-tracker', icon: Palette, label: 'Shade tracker' },
  { to: '/time-machine', icon: Hourglass, label: 'Time machine' },
  { to: '/scan', icon: Camera, label: 'New scan', tour: 'tour-scan' },
  { to: '/leaderboard', icon: Trophy, label: 'Rank' },
  { to: '/blog', icon: Newspaper, label: 'Blog' },
  { to: '/subscription', icon: CreditCard, label: 'Subscription' },
  { to: '/family', icon: Users, label: 'Family' },
  { to: '/profile', icon: User, label: 'Profile', tour: 'tour-profile' },
  { to: '/referrals', icon: Gift, label: 'Refer & earn' },
];

export default function AppShell() {
  return (
    <TourProvider>
      <AppShellContent />
      <TourOverlay />
    </TourProvider>
  );
}

function AppShellContent() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  useUserMirrorSync();
  const { start: startTour } = useTour();
  const navRef = useRef(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const [briefPending, setBriefPending] = useState(false);
  const [isDentist, setIsDentist] = useState(false);
  const [showAccountExists, setShowAccountExists] = useState(false);
  const [accountExistsEmail, setAccountExistsEmail] = useState('');
  const { user: authUser } = useAuth();

  useEffect(() => {
    const update = () => setBriefPending(hasUnreadBriefs());
    update();
    const onVisible = () => { if (!document.hidden) update(); };
    const onBriefChanged = () => update();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('brief-pending-changed', onBriefChanged);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('brief-pending-changed', onBriefChanged);
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => {
      setShowTopFade(nav.scrollTop > 4);
      setShowBottomFade(nav.scrollTop + nav.clientHeight < nav.scrollHeight - 4);
    };
    nav.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => nav.removeEventListener('scroll', onScroll);
  }, []);

  // Sync cookie consent with the server: honor the server record if one
  // exists (no re-prompt on a fresh browser), or push the local choice up.
  useEffect(() => {
    syncConsentFromServer().catch(() => {});
    syncBriefReadStates().catch(() => {});
  }, []);

  // Warm the most-likely next route chunks on idle so taps feel instant.
  useEffect(() => {
    return prefetchOnIdle(['/profile', '/my-scans', '/scan']);
  }, []);

  // Process any pending referral code — Google Sign-In bypasses the email
  // verification flow where referral codes are normally processed. Safe to
  // run on every mount: createReferralFromStoredCode has duplicate checks and
  // clears the stored code, so it only acts once.
  useEffect(() => {
    if (!authUser?.id) return;
    (async () => {
      try {
        const { getPendingReferralCode, createReferralFromStoredCode } = await import("@/lib/referral");
        if (!getPendingReferralCode()) return;
        await createReferralFromStoredCode(authUser);
      } catch {}
    })();
  }, [authUser]);

  // Google Sign-In lands users on a protected page already authenticated, but
  // with no teewai username/display name. Send them to the profile step first.
  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;
    queryClientInstance.fetchQuery(profileQueryOptions(authUser)).then((u) => {
      if (cancelled) return;
      // Only send genuinely new users (no username set yet) to the profile
      // step. A returning user who already has a username must never be
      // bounced back, even if onboarding_completed is missing (older accounts
      // or a silent save failure on first pass).
      if (u?.id && !u.username) {
        navigate('/complete-profile', { replace: true });
        return;
      }
      // Existing user arriving via Google from the Register page: the OAuth
      // flow logged them straight in (create-or-login), so rather than trying
      // to create a duplicate, welcome them back and clean the marker param.
      const params = new URLSearchParams(window.location.search);
      if (params.get('google_register') === '1') {
        setShowAccountExists(true);
        setAccountExistsEmail(u?.email || '');
        params.delete('google_register');
        const clean = params.toString();
        navigate(clean ? `${pathname}?${clean}` : pathname, { replace: true });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [authUser?.id, navigate]);

  // Detect dentist-registered accounts so the portal switcher can appear in
  // the sidebar. A DentistProfile record means the user upgraded to dentist.
  useEffect(() => {
    if (!authUser) return;
    unrufld.entities.DentistProfile.filter({ user_id: authUser.id })
      .then((profiles) => setIsDentist(profiles.length > 0))
      .catch(() => {});
  }, [authUser]);

  // Warm the subscription cache on app load so the Scan page can render
  // instantly instead of gating on a fresh fetch every entry.
  useEffect(() => {
    subscriptions.filter({})
      .then((s) => setCachedSubscription(s[0] || null))
      .catch(() => {});
  }, []);

  // Remember the last in-app page before the subscription page, so a Paystack
  // full-page return can send the user back there instead of stranding them.
  useEffect(() => {
    if (pathname !== '/subscription') sessionStorage.setItem('teewai_sub_from', pathname);
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await unrufld.auth.logout(new URL('/login', window.location.origin).href);
    } catch (e) {
      setLoggingOut(false);
      console.error('Logout failed:', e);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:min-h-screen lg:fixed lg:inset-y-0 border-r border-border bg-card flex-col p-6">
        {isNativeApp() ? (
          <div className="flex items-center gap-2 mb-8 cursor-default">
            <Logo size={36} className="olo-glow" />
            <span className="font-heading font-700 text-lg tracking-tight">teewai</span>
          </div>
        ) : (
          <Link to="/" className="flex items-center gap-2 mb-8">
            <Logo size={36} className="olo-glow" />
            <span className="font-heading font-700 text-lg tracking-tight">teewai</span>
          </Link>
        )}

        <div className="relative flex-1 min-h-0">
          <div
            className={`pointer-events-none absolute top-0 inset-x-0 z-10 h-10 bg-gradient-to-b from-card via-card/80 to-transparent transition-opacity duration-300 ${showTopFade ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            className={`pointer-events-none absolute bottom-0 inset-x-0 z-10 h-10 bg-gradient-to-t from-card via-card/80 to-transparent transition-opacity duration-300 ${showBottomFade ? 'opacity-100' : 'opacity-0'}`}
          />
          <nav ref={navRef} className="sidebar-scroll flex flex-col gap-1 h-full overflow-y-auto min-h-0 pb-2">
            {NAV_ITEMS.map(({ to, icon: Icon, label, tour }) => {
              const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  data-tour={tour}
                  onMouseEnter={() => prefetchRoute(to)}
                  onTouchStart={() => prefetchRoute(to)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'text-olo bg-olo/10'
                      : 'text-muted-foreground hover:text-olo hover:bg-olo/5'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{label}</span>
                  {to === '/briefs' && briefPending && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-olo brief-glow-dot flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-border mt-4">
          <NotificationsBell side="right" />
          <TextZoomControl dropUp showLabel />
          <ThemeToggle />
        </div>
        <div className="pt-2 space-y-1">
          {isDentist && (
            <PortalSwitcher to="/dentist-dashboard" label="Switch to dentist view" icon={Stethoscope} />
          )}
          <Link
            to="/find-dentist"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-olo hover:bg-olo/5 transition-colors"
          >
            <MapPinned className="w-5 h-5" />
            <span>Find a Dentist</span>
          </Link>
          <button
            onClick={startTour}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-olo hover:bg-olo/5 transition-colors"
          >
            <Compass className="w-5 h-5" />
            <span>Take the tour</span>
          </button>
          <Link
            to="/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-olo hover:bg-olo/5 transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            <span>Help center</span>
          </Link>
          <Link
            to="/support"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-olo hover:bg-olo/5 transition-colors"
          >
            <LifeBuoy className="w-5 h-5" />
            <span>Customer Service</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      {/* Height grows by the status-bar inset so nothing sits under the notch */}
      <header
        data-consent-offset
        className="lg:hidden fixed top-0 inset-x-0 z-[700] bg-card border-b border-border frost-edge flex items-center justify-between px-4"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(3.5rem + env(safe-area-inset-top))' }}
      >
        {isNativeApp() ? (
          <div className="flex items-center gap-2 cursor-default">
            <Logo size={28} />
            <span className="font-heading font-700 text-base tracking-tight">teewai</span>
          </div>
        ) : (
          <Link to="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-heading font-700 text-base tracking-tight">teewai</span>
          </Link>
        )}
        <div className="flex items-center gap-1">
          <TextZoomControl />
          <ThemeToggle />
          <NotificationsBell />
          <MobileMoreMenu onLogout={handleLogout} isDentist={isDentist} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:ml-64 p-4 pt-safe-app lg:p-10 pb-24 lg:pb-10">
        {/* Page chunks load inside the content area so the sidebar / nav stay
            mounted. A per-route error boundary keeps the shell (nav, logout)
            intact if a single page crashes — only the content area shows the
            fallback, so the user can navigate away instead of being stranded. */}
        <ErrorBoundary compact>
          <Suspense fallback={<PageSkeleton pagePath={pathname} />}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Brief popup — fires for completed periods */}
      <BriefManager />
      <BriefSleekAlert />

      {/* Billing expired — Spotify-style full-screen overlay on login */}
      <BillingExpiredScreen />

      {/* Find a Dentist — full-screen Telegram-style mini-app overlay */}
      <FindDentistMiniApp />

      {/* Paywall — full-screen upgrade overlay (Box Box Club inspired) */}
      <PaywallOverlay />

      {/* Mobile bottom nav */}
      <BottomNav />

      {loggingOut && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner />
            <p className="text-sm text-muted-foreground">Signing you out…</p>
          </div>
        </div>
      )}

      {showAccountExists && (
        <AccountExistsNotice
          email={accountExistsEmail}
          onDismiss={() => setShowAccountExists(false)}
        />
      )}
    </div>
  );
}