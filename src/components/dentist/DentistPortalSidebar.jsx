import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '@/components/Logo';
import { LayoutDashboard, CalendarDays, Users, Inbox, CreditCard, Building2, Settings, Stethoscope, LogOut, Menu, X } from 'lucide-react';

// Sidebar for the DentistPortal test page (/dentist-test). Mirrors the
// AppShell sidebar pattern: fixed desktop sidebar + mobile drawer. Internal
// tabs (overview/appointments/patients) switch the page state; the remaining
// items are route links to the dedicated dentist pages.

const TABS = [
  { key: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { key: 'appointments', icon: CalendarDays, label: 'Appointments' },
  { key: 'patients', icon: Users, label: 'My Patients' },
];

const ROUTES = [
  { to: '/dentist-pending', icon: Inbox, label: 'Pending Requests' },
  { to: '/dentist-billing', icon: CreditCard, label: 'Subscription & Billing' },
  { to: '/dentist-profile', icon: Building2, label: 'Practice Profile' },
  { to: '/dentist-settings', icon: Settings, label: 'Settings' },
];

export default function DentistPortalSidebar({ tab, onTabChange, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
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

  const isRouteActive = (to) => pathname === to || pathname.startsWith(to);

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
          {TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { onTabChange(key); setDrawerOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === key ? 'text-olo bg-olo/10' : 'text-muted-foreground hover:text-olo hover:bg-olo/5'}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
          {ROUTES.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isRouteActive(to) ? 'text-olo bg-olo/10' : 'text-muted-foreground hover:text-olo hover:bg-olo/5'}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="pt-4 border-t border-border mt-4 space-y-1">
        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-olo hover:bg-olo/5 transition-colors">
          <Stethoscope className="w-5 h-5" /> Back to user app
        </Link>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
          <LogOut className="w-5 h-5" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:min-h-screen lg:fixed lg:inset-y-0 border-r border-border bg-card flex-col p-6">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border flex items-center justify-between px-4" style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <Link to="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-heading font-700 text-base tracking-tight">Dentist</span>
        </Link>
        <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="p-2 rounded-lg hover:bg-muted">
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border p-6 flex flex-col">
            <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}