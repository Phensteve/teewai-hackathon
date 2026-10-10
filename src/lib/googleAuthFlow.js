import { unrufld } from '@/api/unrufldClient';
import { rememberAuthDestination } from '@/lib/authNavigation';

export function beginGoogleAuth(intent) {
  rememberAuthDestination();
  sessionStorage.setItem('teewai_just_logged_in', '1');
  const callback = '/post-login?auth_method=google' + (intent === 'signup' ? '&google_register=1' : '');
  return unrufld.auth.loginWithProvider('google', callback);
}

export function isExistingAccountError(error) {
  const code = String(error?.response?.data?.code || error?.code || '');
  const message = String(error?.message || error?.response?.data?.message || '');
  return /email.*(already|exists|registered)|already.*(registered|exists)|account_exists_with_different_credential/i.test(code + ' ' + message);
}

export function googleAuthError(error) {
  if (isExistingAccountError(error)) {
    return 'Sign in with your existing password to keep using the same account. Google sign-in needs to be linked by the sign-in provider; please don’t create a second account.';
  }
  return 'Google sign-in could not finish. Try again, or use your email and password.';
}