import { Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Camera, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import Logo from '@/components/Logo';
import PageSkeleton from '@/components/loading/PageSkeleton';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/scan', icon: Camera, label: 'Scan' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await import('@/api/unrufldClient').then(({ unrufld }) => unrufld.auth.logout('/login'));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-heading text-lg font-700 tracking-tight">teewai</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-caption text-muted-foreground sm:block">
              {user?.email || ''}
            </span>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 lg:pb-12">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-3xl items-stretch px-2 py-1.5">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-colors ${active ? 'text-olo' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}