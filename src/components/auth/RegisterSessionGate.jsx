import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionCheck from '@/hooks/use-session-check';
import accountProfile from '@/lib/accountProfile';
import { unrufld } from '@/api/unrufldClient';
import { rememberAuthDestination } from '@/lib/authNavigation';
import { goBack } from '@/lib/navigationTrail';
import AuthLoading from '@/components/auth/AuthLoading';
import SignedInAccountPrompt from '@/components/auth/SignedInAccountPrompt';

export default function RegisterSessionGate({ children }) {
  const { user, isAuthenticated, authChecked, isLoadingAuth, isLoadingPublicSettings, sessionError, retrySession } = useSessionCheck();
  const [account, setAccount] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let cancelled = false;
    setProfileError(null);
    accountProfile(user).then((profile) => {
      if (!cancelled) setAccount(profile);
    }).catch(() => { if (!cancelled) setProfileError('We couldn’t load your account. Please try again.'); });
    return () => { cancelled = true; };
  }, [isAuthenticated, user, attempt]);
  if (!authChecked || isLoadingAuth || isLoadingPublicSettings) return <AuthLoading label="Checking your account…" />;
  if (sessionError) return <AuthLoading error={sessionError} onRetry={retrySession} />;
  if (profileError) return <AuthLoading error={profileError} onRetry={() => setAttempt((n) => n + 1)} />;
  if (isAuthenticated && !account) return <AuthLoading label="Loading your account…" />;
  if (isAuthenticated && account) {
    return <SignedInAccountPrompt account={account} onClose={() => goBack(navigate, '/dashboard', true)}
      onSwitchAccount={() => unrufld.auth.logout(window.location.href)} onContinue={() => {
      rememberAuthDestination();
      navigate('/post-login', { replace: true });
    }} />;
  }
  return children;
}