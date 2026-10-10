import { isAuthFlow, safeReturnTo } from '@/lib/authReturnTo';

const key = 'teewai_page_trail';
const publicPaths = new Set(['/', '/free-scan', '/pricing', '/refunds', '/cookies', '/referral-policy', '/referral-flyer', '/hometest', '/terms', '/blog', '/news', '/community', '/teewai-world', '/privacy', '/support', '/help', '/sitemap', '/reference-material', '/admin']);
let lastObserved = null;
const visit = Math.random().toString(36).slice(2);
function read() {
  try { const data = JSON.parse(sessionStorage.getItem(key) || '[]'); return Array.isArray(data) ? data.filter((item) => typeof item.path === 'string') : []; }
  catch { return []; }
}
function save(trail) {
  try { sessionStorage.setItem(key, JSON.stringify(trail.slice(-40))); } catch { /* Navigation also works without storage. */ }
}
export function recordPage(location, type) {
  const raw = location.pathname + location.search;
  const previous = lastObserved;
  lastObserved = raw;
  if (isAuthFlow(raw)) {
    if (previous && !isAuthFlow(previous) && ['/login', '/register'].includes(location.pathname)) {
      sessionStorage.removeItem('teewai_post_login_dest');
    }
    return;
  }
  const path = safeReturnTo(raw);
  const trail = read();
  const entry = { path, key: location.key, index: window.history.state?.idx, visit };
  const index = trail.findIndex((item) => item.key === entry.key && item.path === path);
  if (type === 'POP' && index >= 0) { save([...trail.slice(0, index), entry]); return; }
  if (trail.at(-1)?.path === path) trail[trail.length - 1] = entry;
  else if (type === 'REPLACE' && previous && !isAuthFlow(previous) && trail.at(-1)?.path === safeReturnTo(previous)) trail[trail.length - 1] = entry;
  else trail.push(entry);
  save(trail);
}
export function backDestination(fallback = '/', authenticated = false) {
  const raw = window.location.pathname + window.location.search;
  const current = isAuthFlow(raw) ? raw : safeReturnTo(raw);
  const trail = read();
  if (!isAuthFlow(window.location.pathname) && trail.at(-1)?.path === current) trail.pop();
  while (trail.length) {
    const path = safeReturnTo(trail.at(-1).path);
    if (path !== current && (authenticated || publicPaths.has(path.split('?')[0]))) {
      save(trail);
      return path;
    }
    trail.pop();
  }
  save(trail);
  const target = safeReturnTo(fallback);
  return target !== current ? target : authenticated ? '/dashboard' : '/';
}

export function goBack(navigate, fallback, authenticated) {
  const destination = backDestination(fallback, authenticated);
  const previous = read().at(-1);
  const currentIndex = window.history.state?.idx;
  if (previous?.path === destination && previous.visit === visit && Number.isInteger(currentIndex) && Number.isInteger(previous.index) && previous.index < currentIndex) {
    navigate(previous.index - currentIndex);
  } else navigate(destination, { replace: true });
}