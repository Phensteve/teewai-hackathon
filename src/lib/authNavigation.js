import { safeReturnTo } from '@/lib/authReturnTo';

const destinationKey = 'teewai_post_login_dest';
export function authDestination() {
  const requested = new URLSearchParams(window.location.search).get('returnTo');
  return safeReturnTo(requested || sessionStorage.getItem(destinationKey));
}
export function rememberAuthDestination() {
  const destination = authDestination();
  if (destination === '/') sessionStorage.removeItem(destinationKey);
  else sessionStorage.setItem(destinationKey, destination);
  return destination;
}
export function authPageLink(path) {
  const destination = authDestination();
  return destination === '/' ? path : `${path}?returnTo=${encodeURIComponent(destination)}`;
}
export function consumeAuthDestination() {
  const destination = authDestination();
  sessionStorage.removeItem(destinationKey);
  return destination;
}