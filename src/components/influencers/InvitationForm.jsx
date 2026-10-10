import { useState } from 'react';
import { influencerCall } from '@/lib/influencers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function InvitationForm({ campaign, onSaved, onCancel }) {
  const [name, setName] = useState(campaign?.name || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { const result = await influencerCall('create', { name, code, campaign_id: campaign?.id }, true); await onSaved(result.campaign); setName(''); setCode(''); }
    catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };
  return <form onSubmit={save} className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h3 className="text-h3">Create invitation code</h3>
    <label className="block text-caption">Influencer name<Input required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
    <label className="block text-caption">Invitation code<Input required minLength={3} maxLength={32} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} placeholder="CREATORNAME" /></label>
    <p className="text-caption text-muted-foreground">Counts completed account signups, once per user.</p>
    {error && <p role="alert" className="text-caption text-destructive">{error}</p>}
    <div className="flex gap-2"><Button disabled={busy}>{busy ? 'Creating…' : 'Create invitation code'}</Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}</div>
  </form>;
}