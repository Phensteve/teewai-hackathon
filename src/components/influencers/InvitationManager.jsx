import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { influencerCall } from '@/lib/influencers';
import InvitationForm from '@/components/influencers/InvitationForm';
import InfluencerCampaignCard from '@/components/influencers/InfluencerCampaignCard';
import { Button } from '@/components/ui/button';
export default function InvitationManager({ callerRole, onDiscount }) {
  const qc = useQueryClient();
  const query = useInfiniteQuery({ queryKey: ['influencer-campaigns'], queryFn: ({ pageParam }) => influencerCall('list', { cursor: pageParam }, true), initialPageParam: null, getNextPageParam: page => page.has_more ? page.next_cursor : undefined });
  const reload = () => qc.invalidateQueries({ queryKey: ['influencer-campaigns'] });
  const canCreate = callerRole === 'super_admin';
  return <div className="space-y-5">
    <h2 className="text-h2">Influencer invitation codes</h2>
    {canCreate ? <InvitationForm onSaved={reload} /> : <p className="text-caption text-muted-foreground">Only super admins can create invitation codes.</p>}
    {query.isPending && <p role="status">Loading invitation codes…</p>}
    {query.error && <p role="alert" className="text-destructive">{query.error.response?.data?.error || query.error.message}</p>}
    {query.data?.pages[0]?.items.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-muted-foreground">No influencer codes yet.</p>}
    <div className="grid md:grid-cols-2 gap-4">{query.data?.pages.flatMap(p => p.items).map(c => <InfluencerCampaignCard key={c.id} campaign={c} canCreate={canCreate} onDiscount={onDiscount} onChanged={reload} />)}</div>
    {query.hasNextPage && <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Load more</Button>}
  </div>;
}