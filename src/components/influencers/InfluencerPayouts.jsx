import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { influencerCall } from '@/lib/influencers';
import { Button } from '@/components/ui/button';
export default function InfluencerPayouts({ callerRole }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const query = useInfiniteQuery({ queryKey: ['influencer-payouts'], queryFn: ({ pageParam }) => influencerCall('payouts', { cursor: pageParam }, true), initialPageParam: null, getNextPageParam: p => p.has_more ? p.next_cursor : undefined, refetchInterval: 30000 });
  const settle = async id => {
    if (!window.confirm('Confirm that you have already paid this influencer. This does not send money.')) return;
    setBusy(id); setError('');
    try { await influencerCall('settle', { id }, true); await Promise.all([qc.invalidateQueries({ queryKey: ['influencer-payouts'] }), qc.invalidateQueries({ queryKey: ['influencer-payout-count'] })]); }
    catch (e) { setError(e.response?.data?.error || e.message); } finally { setBusy(null); }
  };
  return <div className="space-y-4"><h2 className="text-h2">Payouts</h2>
    <p className="text-caption text-muted-foreground">Payout requests are disabled until the influencer payment structure is configured. Settlement records payments made outside the app.</p>
    {query.isPending && <p role="status">Loading payouts…</p>}
    {(error || query.error) && <p role="alert" className="text-destructive">{error || query.error.message}</p>}
    {query.data?.pages[0]?.items.length === 0 && <p className="p-6 rounded-xl border border-dashed border-border text-muted-foreground">No payout requests.</p>}
    {query.data?.pages.flatMap(p => p.items).map(p => <article key={p.id} className="p-4 rounded-xl bg-card border border-border space-y-2"><h3 className="text-h3">{p.influencer_name}</h3><p>{p.message || 'Payout requested'}</p><p className="text-caption">{p.amount != null ? `${p.currency || ''} ${p.amount}` : 'Amount not configured'} · {p.status}</p><p className="text-caption text-muted-foreground">Requested {new Date(p.created_date).toLocaleString()}{p.settled_at && ` · Settled ${new Date(p.settled_at).toLocaleString()}`}</p>{p.status === 'pending' && ['super_admin', 'admin'].includes(callerRole) && <Button disabled={busy === p.id} onClick={() => settle(p.id)}>{busy === p.id ? 'Settling…' : 'Settle'}</Button>}</article>)}
    {query.hasNextPage && <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Load more</Button>}
  </div>;
}