import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { influencerCall } from '@/lib/influencers';
import CopyInfluencerLink from '@/components/influencers/CopyInfluencerLink';
export default function InfluencerCampaignCard({ campaign: c, canCreate, onDiscount, onChanged }) {
  const [error, setError] = useState('');
  const toggle = async () => { try { await influencerCall('toggle', { id: c.id }, true); await onChanged(); } catch (e) { setError(e.response?.data?.error || e.message); } };
  return <article className="p-4 rounded-xl border border-border bg-card space-y-3">
    <div className="flex justify-between gap-3"><div><h3 className="text-h3">{c.name}</h3><p className="text-caption text-muted-foreground">{c.active ? 'Active' : 'Inactive'}</p></div>{canCreate && <Button variant="outline" size="sm" onClick={toggle}>{c.active ? 'Deactivate' : 'Activate'}</Button>}</div>
    <div className="grid grid-cols-2 gap-3"><div><p className="text-caption text-muted-foreground">Invitation code</p><strong>{c.invitation_code || 'Not created'}</strong><p className="text-caption">{c.signup_count} signups</p></div><div><p className="text-caption text-muted-foreground">Discount code</p><strong>{c.discount_code || (c.coupon_missing ? 'Deleted discount' : 'Not created')}</strong><p className="text-caption">{c.discount_uses} uses</p>{(!c.coupon_id || c.coupon_missing) && canCreate && <button onClick={() => onDiscount(c)} className="text-primary text-caption font-medium">Create discount code</button>}</div></div>
    <CopyInfluencerLink campaign={c} />
    {c.invitation_code && <CopyInfluencerLink campaign={c} invitation />}
    <p className="text-caption text-muted-foreground">Pending payment: awaiting payment structure.</p>
    {error && <p role="alert" className="text-caption text-destructive">{error}</p>}
  </article>;
}