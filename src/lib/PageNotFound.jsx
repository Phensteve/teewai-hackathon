import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Home, Compass } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { useQuery } from '@tanstack/react-query';
import Logo from '@/components/Logo';

export default function PageNotFound({}) {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await unrufld.auth.me();
        return { user, isAuthenticated: true };
      } catch (error) {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-[0.08]" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] radial-olo opacity-40" />
      <div className="relative z-10 max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Logo size={36} className="olo-glow" />
          <span className="font-heading font-700 text-lg tracking-tight">teewai</span>
        </div>

        <div className="space-y-2 mb-6">
          <h1 className="font-heading font-800 text-7xl tracking-tight text-olo olo-text-glow">404</h1>
          <div className="h-0.5 w-16 bg-olo/40 mx-auto rounded-full" />
        </div>

        <h2 className="font-heading font-700 text-2xl mb-2">Are you lost?</h2>
        <p className="text-muted-foreground leading-relaxed mb-1">
          The page <span className="font-medium text-foreground">"{pageName}"</span> isn't part of teewai.
        </p>
        <p className="text-sm text-muted-foreground mb-7">Let's get you back on the trail.</p>

        {/* Sitemap escape hatch with a diagonal arrow */}
        <div className="mb-6">
          <Link
            to="/sitemap"
            className="inline-flex items-center gap-1.5 text-olo font-semibold group"
          >
            <Compass className="w-4 h-4" />
            See the full sitemap
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow"
          >
            <Home className="w-4 h-4" /> Go home
          </button>
        </div>

        {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
          <div className="mt-8 p-4 bg-muted/40 rounded-xl border border-border text-left">
            <p className="text-sm font-medium text-foreground">Admin note</p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              This route may not be wired up yet. Check the router configuration to confirm the path is registered.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}