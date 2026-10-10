import { useState } from 'react';
import { trackingLink, invitationLink } from '@/lib/influencers';
export default function CopyInfluencerLink({ campaign, invitation = false }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const link = invitation ? invitationLink(campaign) : trackingLink(campaign);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError('Copy the link from the field below.'); }
  };
  return <div className="space-y-1">
    <div className="flex flex-wrap items-center gap-3 text-caption"><a href={link} target="_blank" rel="noreferrer" className="text-primary underline">{invitation ? 'Signup link' : 'Influencer tracking link'}</a><button type="button" onClick={copy} className="text-primary font-medium">{copied ? 'Copied' : 'Copy link'}</button></div>
    <input aria-label={invitation ? 'Signup link' : 'Influencer tracking link'} readOnly value={link} onFocus={e => e.target.select()} className="w-full min-w-0 rounded-lg border border-border bg-background p-2 text-xs text-muted-foreground" />
    {error && <p className="text-caption text-muted-foreground">{error}</p>}
    {!invitation && <p className="text-xs text-muted-foreground">No login needed. Only share this private link with the influencer.</p>}
  </div>;
}