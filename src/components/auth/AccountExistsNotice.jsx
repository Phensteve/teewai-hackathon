import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { userProfile } from '@/lib/insforgeDb';
import SignedInAccountPrompt from '@/components/auth/SignedInAccountPrompt';

// Google has already authenticated this account: never ask it to log in again.
export default function AccountExistsNotice({ email, onDismiss }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  useEffect(() => {
    let cancelled = false;
    userProfile.get().then((profile) => {
      if (!cancelled) setAccount(profile);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const close = () => onDismiss ? onDismiss() : navigate('/dashboard', { replace: true });
  return <SignedInAccountPrompt account={account || user || { email }} onClose={close} onContinue={close} />;
}