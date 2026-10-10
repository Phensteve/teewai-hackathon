import { Skeleton } from '@/components/ui/skeleton';
import { isNativeApp } from '@/lib/isNativeApp';

export default function NavigationSkeleton({ navigation, children }) {
  if (navigation === 'landing') return <div className="min-h-[100dvh] bg-background">{children}</div>;
  const workspace = navigation === 'patient' || navigation === 'dentist';
  const bottom = navigation === 'patient';
  if (!navigation) return <div className="p-4 sm:p-8">{children}</div>;
  return <div className="min-h-[100dvh] bg-background">
    {workspace && <aside aria-hidden="true" className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-border bg-card p-6 flex-col gap-5"><div className="flex gap-3 items-center mb-4"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-6 w-24" /></div>{Array.from({ length: navigation === 'dentist' ? 7 : 13 }, (_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}<Skeleton className="h-10 w-full mt-auto" /></aside>}
    <header aria-hidden="true" className={`fixed top-0 inset-x-0 z-50 bg-card border-b border-border flex items-center justify-between px-4 ${workspace ? 'lg:hidden' : ''}`} style={{ height: 'calc(3.5rem + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex gap-2 items-center"><Skeleton className="h-7 w-7 rounded-lg" /><Skeleton className="h-5 w-20" /></div>
      <div className="flex gap-2">{Array.from({ length: navigation === 'dentist' ? 1 : 4 }, (_, i) => <Skeleton key={i} className="h-8 w-8 rounded-lg" />)}</div>
    </header>
    <main className={`p-4 pt-safe-app lg:p-10 ${workspace ? 'lg:ml-64' : 'lg:pt-24'} ${bottom ? 'pb-24 lg:pb-10' : ''}`}>{children}</main>
    {bottom && <nav aria-hidden="true" className={`lg:hidden fixed bottom-0 inset-x-0 border-t border-border bg-card px-1 py-1.5 flex gap-1 ${isNativeApp() ? '' : 'safe-area-inset-bottom'}`}>
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="flex-1 flex flex-col items-center justify-center gap-1 py-1"><Skeleton className="h-7 w-9 rounded-lg" /><Skeleton className="h-2.5 w-9" /></div>)}
    </nav>}
  </div>;
}