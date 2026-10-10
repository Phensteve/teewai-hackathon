import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { claimInvitation } from '@/lib/influencers';
export default function InvitationAttribution() {
  const { user } = useAuth();
  useEffect(() => { if (user?.id) claimInvitation().catch(() => {}); }, [user?.id]);
  return null;
}