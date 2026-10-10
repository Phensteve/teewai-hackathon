import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { unrufld } from '@/api/unrufldClient';

let pendingCheck = null;
function verifySession(checkUserAuth) {
  if (!pendingCheck) {
    // The SDK shares concurrent me() requests, so this is one server check.
    const request = Promise.all([unrufld.auth.me(), checkUserAuth()])
      .then(([user]) => user)
      .finally(() => { if (pendingCheck === request) pendingCheck = null; });
    pendingCheck = request;
  }
  return pendingCheck;
}

export default function useSessionCheck() {
  const auth = useAuth();
  const check = useRef(auth.checkUserAuth);
  check.current = auth.checkUserAuth;
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState({ checked: false, user: null, error: null });
  useEffect(() => {
    if (auth.isLoadingPublicSettings) return;
    let cancelled = false;
    setSession({ checked: false, user: null, error: null });
    verifySession(check.current).then((user) => {
      if (!cancelled) setSession({ checked: true, user, error: null });
    }).catch((error) => {
      const status = error.status || error.response?.status;
      if (!cancelled) setSession({ checked: true, user: null,
        error: status === 401 || status === 403 ? null : 'We couldn’t check your session. Please try again.' });
    });
    return () => { cancelled = true; };
  }, [auth.isLoadingPublicSettings, attempt]);
  return { ...auth, user: session.user, isAuthenticated: !!session.user,
    authChecked: session.checked, isLoadingAuth: !session.checked || auth.isLoadingAuth,
    sessionError: session.error, retrySession: () => { setSession({ checked: false, user: null, error: null }); setAttempt((n) => n + 1); } };
}