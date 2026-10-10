import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import useSessionCheck from '@/hooks/use-session-check';
import { safeReturnTo } from '@/lib/authReturnTo';
import { unrufld } from '@/api/unrufldClient';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AuthLoading from '@/components/auth/AuthLoading';
import PageSkeleton from '@/components/loading/PageSkeleton';

export default function ProtectedRoute({ fallback = <PageSkeleton withNavigation />, unauthenticatedElement }) {
  const { user, isAuthenticated, authChecked, isLoadingAuth, isLoadingPublicSettings, authError, sessionError, retrySession } = useSessionCheck();
  const checking = !authChecked || isLoadingAuth || isLoadingPublicSettings;

  // Mirror this login into InsForge once, after the post-login redirect. The
  // login flows set a sessionStorage flag right before auth; ProtectedRoute is
  // the first authenticated surface to mount, so it consumes the flag here —
  // covering password, OTP and Google paths uniformly.
  useEffect(() => {
    if (!checking && user && isAuthenticated && sessionStorage.getItem('teewai_just_logged_in') === '1') {
      sessionStorage.removeItem('teewai_just_logged_in');
      unrufld.functions.invoke('mirrorLogin', {}).catch(() => {});
    }
  }, [checking, user, isAuthenticated]);

  // A previous successful check must not unlock screens during revalidation.
  if (checking) return fallback;
  if (sessionError) return <AuthLoading error={sessionError} onRetry={retrySession} />;
  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;
  if (!isAuthenticated || !user) {
    // Preserve the intended destination so the post-login resolver can return
    // to it after auth — deep links (e.g. /dentist-dashboard, /scan) survive.
    const returnTo = safeReturnTo(window.location.pathname + window.location.search);
    return unauthenticatedElement || <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  return <Outlet />;
}