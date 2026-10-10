import { useQuery } from '@tanstack/react-query';
import { influencerCall } from '@/lib/influencers';
import { Button } from '@/components/ui/button';
export default function InfluencerProgress() {
  const token = window.location.hash.slice(1);
  const query = useQuery({ queryKey: ['influencer-progress', token], queryFn: () => influencerCall('progress', { tracking_token: token }), retry: false, refetchInterval: 30000 });
  const c = query.data;
  return <main className="min-h-screen bg-background text-foreground px-5 py-10 safe-area-inset-top"><div className="max-w-2xl mx-auto space-y-6">
    <p className="text-label text-primary">teewai · Influencer progress</p>
    {query.isPending && <p role="status">Loading your progress…</p>}
    {query.error && <p role="alert" className="text-destructive">{query.error.response?.data?.error || 'This tracking link is invalid or unavailable.'}</p>}
    {c && <><div><h1 className="text-h1">{c.name}</h1><p className="text-caption text-muted-foreground">Your private progress dashboard. No login required.</p></div>
      <div className="grid sm:grid-cols-2 gap-4"><section className="p-5 rounded-xl border border-border bg-card"><h2 className="text-h3">Invitations</h2><p className="text-caption text-muted-foreground">{c.invitation_code || 'No invitation code linked'}</p><p className="text-display mt-3">{c.signup_count}</p><p className="text-caption">Account signups</p>{!c.active && <p className="text-caption text-warning">Code inactive</p>}</section><section className="p-5 rounded-xl border border-border bg-card"><h2 className="text-h3">Discount usage</h2><p className="text-caption text-muted-foreground">{c.discount_code || 'No discount code linked'}</p><p className="text-display mt-3">{c.discount_uses}</p><p className="text-caption">Discount code uses</p>{c.discount_code && !c.discount_active && <p className="text-caption text-warning">Discount inactive</p>}</section></div>
      <section className="p-5 rounded-xl border border-border bg-card space-y-3"><h2 className="text-h3">Pending payment</h2><p className="text-muted-foreground">Awaiting payment structure</p><p className="text-caption text-muted-foreground">No earnings are calculated yet. Payout requests will be available once the payment structure is configured.</p><Button disabled title="Payment structure not configured">Request payout</Button></section>
      {c.payouts.length > 0 && <section className="space-y-3"><h2 className="text-h3">Payout history</h2>{c.payouts.map(p => <div key={p.id} className="rounded-xl border border-border p-4"><p>{p.currency} {p.amount} · {p.status}</p><p className="text-caption text-muted-foreground">{p.settled_at ? `Settled ${new Date(p.settled_at).toLocaleDateString()}` : `Requested ${new Date(p.created_date).toLocaleDateString()}`}</p></div>)}</section>}
      <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>Refresh progress</Button>
    </>}
  </div></main>;
}