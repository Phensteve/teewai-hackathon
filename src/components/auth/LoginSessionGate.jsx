import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSessionCheck from '@/hooks/use-session-check';
import { rememberAuthDestination } from '@/lib/authNavigation';
import AuthLoading from '@/components/auth/AuthLoading';

export default function LoginSessionGate({ children }) {
  const session = useSessionCheck();
  const navigate = useNavigate();
  const requireSignIn = new URLSearchParams(window.location.search).get('reauth') === '1';
  const checking = !session.authChecked || session.isLoadingAuth || session.isLoadingPublicSettings;
  useEffect(() => {
    if (!checking && session.isAuthenticated && !session.sessionError && !requireSignIn) {
      rememberAuthDestination();
      navigate('/post-login', { replace: true });
    }
  }, [checking, session.isAuthenticated, session.sessionError, navigate, requireSignIn]);
  if (checking || (session.isAuthenticated && !requireSignIn)) return <AuthLoading label="Opening your account…" />;
  if (session.sessionError) return <AuthLoading error={session.sessionError} onRetry={session.retrySession} />;
  return children;
}