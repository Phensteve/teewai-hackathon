import { unrufld } from '@/api/unrufldClient';

// These independent pre-login safeguards must both finish before signing in.
export default async function loginAccountChecks(email) {
  const justReset = localStorage.getItem('teewai_just_reset') === '1';
  const [statusResult, resetResult] = await Promise.all([
    unrufld.functions.invoke('userProfile', { op: 'checkStatus', identifier: email }).catch(() => null),
    unrufld.functions.invoke('userProfile', { op: 'checkMustReset', email, justReset }).catch(() => null),
  ]);
  return { status: statusResult?.data?.status, mustReset: resetResult?.data?.mustReset, justReset };
}