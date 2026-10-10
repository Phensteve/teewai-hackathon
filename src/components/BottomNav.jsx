import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Camera, Trophy, User, Users, MapPinned, Droplet } from 'lucide-react';
import { isNativeApp } from '@/lib/isNativeApp';
import { useFamilyMembership } from '@/hooks/use-family-membership';
import { prefetchRoute } from '@/lib/routePrefetch';

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isFamilyMember } = useFamilyMembership();

  // Family-plan members see a Family tab; everyone else sees a Dentist tab
  // (manage care team) in that slot. Find a Dentist (map) lives in the hamburger.
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/scan', icon: Camera, label: 'Scan', tour: 'tour-scan' },
    { to: '/leaderboard', icon: Trophy, label: 'Rank' },
    { to: '/stain-tracker', icon: Droplet, label: 'Stains', tour: 'tour-food' },
    isFamilyMember
      ? { to: '/family', icon: Users, label: 'Family' }
      : { to: '/find-dentist', icon: MapPinned, label: 'Dentist' },
    { to: '/profile', icon: User, label: 'Profile', tour: 'tour-profile' },
  ];

  return (
    // In the APK the WebView viewport already stops above the system nav bar,
    // so the extra safe-area padding renders as an empty gap — skip it there.
    <nav className={`lg:hidden sticky bottom-0 w-full z-40 bg-card/95 backdrop-blur-xl border-t border-border frost-edge user-select-none ${isNativeApp() ? '' : 'safe-area-inset-bottom'}`}>
      <div className="flex items-stretch px-1 py-1.5">
        {navItems.map(({ to, icon: Icon, label, tour, launcher }) => {
          const active = !launcher && (pathname === to || (to !== '/dashboard' && pathname.startsWith(to)));
          const baseClass = `flex-1 flex flex-col items-center justify-center gap-1 py-1 min-w-0 transition-colors ${active ? 'text-olo' : 'text-muted-foreground hover:text-olo'}`;

          // The Dentist tab opens the Find a Dentist map as a full-screen
          // Telegram-style mini-app overlay (no route change), so the map
          // feels self-contained instead of a plain dashboard page.
          if (launcher) {
            return (
              <button
                key={to}
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('teewai-open-find-dentist'))}
                className={baseClass}
              >
                <div className="w-9 h-7 flex items-center justify-center rounded-lg transition-all">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </button>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              data-tour={tour}
              onClick={() => {
                if (active) {
                  // Tapping the already-active tab resets to its root + scrolls
                  // to top — standard mobile tab bar behavior.
                  navigate(to);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              onMouseEnter={() => prefetchRoute(to)}
              onTouchStart={() => prefetchRoute(to)}
              className={baseClass}
            >
              <div className={`w-9 h-7 flex items-center justify-center rounded-lg transition-all ${active ? 'bg-olo/15' : ''}`}>
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}