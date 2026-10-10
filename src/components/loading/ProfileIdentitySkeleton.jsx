import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileIdentitySkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading your profile" className="p-6 rounded-3xl border border-border bg-card">
      <span className="sr-only">Loading your profile…</span>
      <div aria-hidden="true">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl shrink-0 bg-muted motion-reduce:animate-none" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-3/5 bg-muted motion-reduce:animate-none" />
            <Skeleton className="h-3 w-4/5 bg-muted motion-reduce:animate-none" />
            <Skeleton className="h-6 w-28 rounded-full bg-muted motion-reduce:animate-none" />
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-border space-y-4">
          <Skeleton className="h-3 w-24 bg-muted motion-reduce:animate-none" />
          <Skeleton className="h-11 w-full rounded-xl bg-muted motion-reduce:animate-none" />
          <Skeleton className="h-12 w-full rounded-xl bg-muted motion-reduce:animate-none" />
          <Skeleton className="h-10 w-36 rounded-xl ml-auto bg-muted motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}