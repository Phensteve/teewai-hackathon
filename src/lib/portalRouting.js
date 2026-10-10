import { unrufld } from '@/api/unrufldClient';
import { safeReturnTo } from '@/lib/authReturnTo';

// Shared post-login routing and portal-switching logic.
//
// teewai accounts can be BOTH patient and dentist (a user can upgrade to
// dentist at any time), so the login page never asks for a role — credentials
// are identical. After auth, the account's actual roles (presence of a
// DentistProfile) decide the landing portal, and a persisted `last_portal`
// preference remembers which side a dual-role user was last on.

// All dentist portal routes share the /dentist prefix.
export function isDentistRoute(path) {
  if (!path) return false;
  return path.startsWith('/dentist');
}

// Resolve where to go after login, given the user's actual roles and any
// original deep link. Non-dentists are never sent to dentist routes.
export function resolvePostLoginDest({ hasDentistProfile, lastPortal, originalReturnTo }) {
  // Never send a completed login back into another auth/setup redirect.
  originalReturnTo = safeReturnTo(originalReturnTo);
  if (originalReturnTo !== '/') {
    // A non-dentist trying to reach a dentist route falls back to the user dashboard.
    if (isDentistRoute(originalReturnTo) && !hasDentistProfile) return '/dashboard';
    if (originalReturnTo === '/dentist') return '/dentist-dashboard';
    if (originalReturnTo === '/my-care-team') return '/find-dentist';
    return originalReturnTo;
  }
  // No deep link: route by actual roles. Dual-role accounts default to the
  // patient dashboard unless they have explicitly chosen the dentist portal
  // (last_portal === 'dentist'). An unverified dentist profile should never
  // hijack the landing surface — the patient dashboard is always usable.
  if (hasDentistProfile && lastPortal === 'dentist') return '/dentist-dashboard';
  return '/dashboard';
}

// Persist the user's last-used portal so the next login returns them there.
export async function setLastPortal(portal) {
  try {
    await unrufld.auth.updateMe({ last_portal: portal });
  } catch {
    /* non-fatal — the switch still works for this session */
  }
}