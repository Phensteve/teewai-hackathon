import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storeInvitation } from '@/lib/influencers';
export default function InvitationCodeInput({ value, onChange }) {
  return <div className="space-y-1.5 mb-3"><Label htmlFor="influencerInvitation">Influencer invitation code <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="influencerInvitation" value={value} placeholder="CREATORNAME" maxLength={32} onChange={e => { const code = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''); onChange(code); storeInvitation(code); }} /><p className="text-xs text-muted-foreground">Invitation codes track signups; discount codes are used at checkout.</p></div>;
}