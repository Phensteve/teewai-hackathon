export default function FinderSkeleton() {
  return <div aria-label="Finding dentists near you" role="status" className="space-y-3">
    {[0,1,2].map(i => <div key={i} className="p-4 rounded-2xl border border-border bg-card space-y-3 motion-safe:animate-pulse">
      <div className="h-4 w-2/3 rounded bg-muted" /><div className="h-3 w-5/6 rounded bg-muted" /><div className="h-3 w-1/3 rounded bg-muted" />
    </div>)}
  </div>;
}