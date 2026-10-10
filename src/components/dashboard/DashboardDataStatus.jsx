import { AlertCircle, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardDataStatus({ title, description, loading = false, onRetry, retrying = false, className = '' }) {
  if (loading) return <section role="status" aria-busy="true" className={`p-5 rounded-2xl border border-border bg-card space-y-4 ${className}`}>
    <span className="sr-only">{title}</span>
    <div aria-hidden="true" className="space-y-4">
      <Skeleton className="h-5 w-2/5 bg-muted motion-reduce:animate-none" />
      <Skeleton className="h-3 w-3/4 bg-muted motion-reduce:animate-none" />
      <Skeleton className="h-20 w-full rounded-xl bg-muted motion-reduce:animate-none" />
    </div>
  </section>;
  return (
    <section role="status" aria-live="polite" aria-busy={loading || retrying} className={`p-4 rounded-2xl border border-border bg-muted/40 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h3 className="text-caption font-heading font-semibold">{title}</h3>
          <p className="text-caption text-muted-foreground mt-1">{description}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} disabled={retrying || loading} className="inline-flex items-center gap-2 mt-3 text-caption font-semibold text-olo disabled:opacity-50">
              <RotateCcw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}