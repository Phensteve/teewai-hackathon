import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { useAuth } from '@/lib/AuthContext';
import { queryClientInstance } from '@/lib/query-client';
import { profileQueryOptions } from '@/lib/profileQuery';
import SignedInAccountPrompt from '@/components/auth/SignedInAccountPrompt';
import AuthLoading from '@/components/auth/AuthLoading';
import { resolvePostLoginDest } from '@/lib/portalRouting';
import { goBack } from '@/lib/navigationTrail';

// Brief post-login resolver: after the SDK hard-redirects here, determine the
// user's actual roles (DentistProfile presence) and last-used portal, then
// client-navigate to the right surface. No role choice was needed at login —
// credentials are identical for patient and dentist accounts.
//
// For first-time signups (Google Sign-In from the Register page, which lands
// here with ?google_register=1), the InsForge mirror profile is checked BEFORE
// navigating. New users are routed to /complete-profile or /onboarding so the
// dashboard never flashes — this page shows only a spinner while resolving.
export default function PostLogin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [existingAccount, setExistingAccount] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        // Check the InsForge mirror profile. A user WITHOUT a username hasn't
        // been through registration yet (brand new Google Sign-In, or someone
        // who skipped the username step) — send them to complete-profile.
        // A user WITH a username has already registered: go straight to the
        // dashboard regardless of onboarding_completed (the flag may be missing
        // for older accounts or may not have saved properly on first pass,
        // which previously trapped existing users in the onboarding loop).
        const [profile, profiles] = await Promise.all([
          queryClientInstance.fetchQuery(profileQueryOptions(user)),
          unrufld.entities.DentistProfile.filter({ user_id: user.id }),
        ]);
        if (cancelled) return;

        if (!profile.username) {
          const google = new URLSearchParams(window.location.search).get('auth_method') === 'google';
          navigate(google ? '/complete-profile?source=google' : '/complete-profile', { replace: true });
          return;
        }

        // Returning user — resolve by roles + deep link.
        if (cancelled) return;
        const hasDentistProfile = profiles.length > 0;
        const lastPortal = user.last_portal || null;
        const originalReturnTo = sessionStorage.getItem('teewai_post_login_dest') || null;
        let dest = resolvePostLoginDest({ hasDentistProfile, lastPortal, originalReturnTo });
        // Returning users who chose signup see their account before any portal opens.
        const params = new URLSearchParams(window.location.search);
        if (params.get('google_register') === '1') {
          setExistingAccount({ profile, destination: dest });
          return;
        }
        sessionStorage.removeItem('teewai_post_login_dest');
        navigate(dest, { replace: true });
      } catch {
        if (!cancelled) setError('Could not finish signing you in. Please try again.');
      }
    })();
    return () => { cancelled = true; };
  }, [user, navigate, attempt]);

  if (existingAccount) {
    const continueAccount = () => {
      sessionStorage.removeItem('teewai_post_login_dest');
      navigate(existingAccount.destination, { replace: true });
    };
    return <SignedInAccountPrompt account={existingAccount.profile} onContinue={continueAccount}
      onClose={() => goBack(navigate, existingAccount.destination, true)} onSwitchAccount={() => unrufld.auth.logout(new URL('/register', window.location.origin).href)} />;
  }
  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => { setError(null); setAttempt((n) => n + 1); }}
          className="text-sm text-olo font-medium hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return <AuthLoading />;
}