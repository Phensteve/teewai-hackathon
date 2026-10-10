import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import Logo from '@/components/Logo';
import PageSkeleton from '@/components/loading/PageSkeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Stethoscope, LayoutDashboard, Users, Inbox, CalendarDays, CreditCard, Building2, Settings, LogOut, Menu, X, User } from 'lucide-react';
import PortalSwitcher from '@/components/PortalSwitcher';
import PageTransition from '@/components/PageTransition';
import FindDentistMiniApp from '@/components/dentist/FindDentistMiniApp';

// Dentist portal layout — distinct from the user portal. Desktop sidebar +
// mobile drawer. Only accounts with a DentistProfile see this chrome; a user
// without a profile sees the registration form rendered by the nested page.

const NAV = [
  { to: '/dentist-dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/dentist-patients', icon: Users, label: 'My Patients' },
  { to: '/dentist-pending', icon: Inbox, label: 'Pending Requests' },
  { to: '/dentist-appointments', icon: CalendarDays, label: 'Appointments' },
  { to: '/dentist-billing', icon: CreditCard, label: 'Subscription & Billing' },
  { to: '/dentist-profile', icon: Building2, label: 'Practice Profile' },
  { to: '/dentist-settings', icon: Settings, label: 'Settings' },
];

export default function DentistShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

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

  const load = useCallback(async () => {
    try {
      const me = await unrufld.auth.me();
      setUser(me);
      const profiles = await unrufld.entities.DentistProfile.filter({ user_id: me.id });
      setProfile(profiles[0] || null);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    await unrufld.auth.logout(new URL('/login', window.location.origin).href);
  };

  // No profile yet: send the dentist to My Patients, which shows the
  // registration form. Avoids an empty Overview for brand-new dentists.
  useEffect(() => {
    if (!loading && !profile && pathname !== '/dentist-patients') {
      navigate('/dentist-patients', { replace: true });
    }
  }, [loading, profile, pathname, navigate]);

  if (loading) return <PageSkeleton withNavigation />;

  if (!profile) return <PageTransition><Outlet context={{ user, profile: null, reload: load }} /></PageTransition>;

  const isActive = (to) => pathname === to || (to !== '/dentist-dashboard' && pathname.startsWith(to));

  const SidebarContent = () => (
    <>
      <Link to="/" className="flex items-center gap-2 mb-8">
        <Logo size={36} className="olo-glow" />
        <div className="leading-tight">
          <span className="font-heading font-700 text-lg tracking-tight block">teewai</span>
          <span className="text-[10px] font-semibold text-olo uppercase tracking-wider">Dentist Portal</span>
        </div>
      </Link>
      <div className="relative flex-1 min-h-0">
        <div
          className={`pointer-events-none absolute top-0 inset-x-0 z-10 h-10 bg-gradient-to-b from-card via-card/80 to-transparent transition-opacity duration-300 ${showTopFade ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          className={`pointer-events-none absolute bottom-0 inset-x-0 z-10 h-10 bg-gradient-to-t from-card via-card/80 to-transparent transition-opacity duration-300 ${showBottomFade ? 'opacity-100' : 'opacity-0'}`}
        />
        <nav ref={navRef} className="sidebar-scroll flex flex-col gap-1 h-full overflow-y-auto min-h-0 pb-2">
          {NAV.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive(to) ? 'text-olo bg-olo/10' : 'text-muted-foreground hover:text-olo hover:bg-olo/5'}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="pt-4 border-t border-border mt-4 space-y-1">
        <PortalSwitcher to="/dashboard" label="Switch to patient view" icon={User} />
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
          <LogOut className="w-5 h-5" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar — persistent (fixed, full-height, stays on scroll) */}
      <aside className="hidden lg:flex lg:w-64 lg:h-screen lg:fixed lg:inset-y-0 lg:left-0 border-r border-border bg-card flex-col p-6 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile top bar — persistent (fixed, opaque, high z-index). Hamburger
         on the left, teewai logo on the right. */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-[70] bg-card border-b border-border flex items-center justify-between px-4" style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="p-2 -ml-2 rounded-lg hover:bg-muted">
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-heading font-700 text-base tracking-tight">Dentist</span>
        </Link>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border p-6 flex flex-col">
            <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:ml-64 p-4 pt-safe-app lg:p-10 pb-24 lg:pb-10">
        <ErrorBoundary compact>
          <Suspense fallback={<PageSkeleton pagePath={pathname} />}>
            <PageTransition>
              <Outlet context={{ user, profile, reload: load }} />
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </main>
      <FindDentistMiniApp />
    </div>
  );
}