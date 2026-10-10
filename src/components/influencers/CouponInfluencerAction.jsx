import { useState } from 'react';
import { influencerCall } from '@/lib/influencers';
import InvitationForm from '@/components/influencers/InvitationForm';
import CopyInfluencerLink from '@/components/influencers/CopyInfluencerLink';
export default function CouponInfluencerAction({ coupon, campaign, canCreate, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const c = current || campaign;
  const ensure = async invitation => {
    setBusy(true); setError('');
    try { const result = c ? { campaign: c } : await influencerCall('couponCampaign', { coupon_id: coupon.id }, true); setCurrent(result.campaign); setEditing(invitation); await onChanged(); }
    catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };
  return <div className="mt-3 space-y-2">
    {c && <CopyInfluencerLink campaign={c} />}
    {c?.invitation_code ? <p className="text-caption">Invitation code: <strong>{c.invitation_code}</strong></p> : canCreate && <button disabled={busy} onClick={() => ensure(true)} className="text-primary text-caption font-medium disabled:opacity-50">Create invitation code</button>}
    {!c && canCreate && <button disabled={busy} onClick={() => ensure(false)} className="ml-3 text-primary text-caption font-medium disabled:opacity-50">Create tracking link</button>}
    {editing && <InvitationForm campaign={c} onCancel={() => setEditing(false)} onSaved={async campaign => { setCurrent(campaign); setEditing(false); await onChanged(); }} />}
    {error && <p className="text-caption text-destructive" role="alert">{error}</p>}
  </div>;
}