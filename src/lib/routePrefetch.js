// Route chunk prefetching — triggers the dynamic import for a route's JS
// chunk BEFORE the user navigates to it, so the page renders instantly on
// click. The browser caches the resolved module, so React.lazy reuses the
// already-loaded chunk (no double download).
//
// Two triggers:
//   1. Idle prefetch (AppShell mounts → requestIdleCallback → load the most
//      likely next routes in the background).
//   2. Hover/touch prefetch (nav links → load that route's chunk the moment
//      the user shows intent, ~200ms before they click).
//
// This is the single biggest perceived-speed win for the in-app nav: the
// chunks for Scan / My scans / Subscription are usually loaded by the time
// the user taps them.

const ROUTE_IMPORTS = {
  '/dashboard': () => import('@/pages/Dashboard'),
  '/my-scans': () => import('@/pages/MyScans'),
  '/scan': () => import('@/pages/Scan'),
  '/braces-check': () => import('@/pages/BracesCheck'),
  '/results': () => import('@/pages/Results'),
  '/subscription': () => import('@/pages/Subscription'),
  '/family': () => import('@/pages/Family'),
  '/home-whitening': () => import('@/pages/HomeWhitening'),
  '/stain-tracker': () => import('@/pages/StainTracker'),
  '/shade-tracker': () => import('@/pages/ShadeTracker'),
  '/briefs': () => import('@/pages/Briefs'),
  '/food-history': () => import('@/pages/FoodHistory'),
  '/timeline': () => import('@/pages/VitaTimeline'),
  '/time-machine': () => import('@/pages/SmileTimeMachine'),
  '/find-dentist': () => import('@/pages/FindDentist'),
  '/leaderboard': () => import('@/pages/Leaderboard'),
  '/profile': () => import('@/pages/Profile'),
  '/checkout': () => import('@/pages/Checkout'),
  '/thank-you': () => import('@/pages/ThankYou'),
  '/write': () => import('@/pages/BlogWrite'),
  '/apply': () => import('@/pages/Apply'),
  '/smile-goal': () => import('@/pages/SmileGoal'),
  '/calibration-card': () => import('@/pages/CalibrationCard'),
  '/security-settings': () => import('@/pages/SecuritySettings'),
  '/tip-history': () => import('@/pages/TipHistory'),
  '/collection': () => import('@/pages/Collection'),
  '/referrals': () => import('@/pages/Referrals'),
  '/routine': () => import('@/pages/Routine'),
  '/ask-teewai': () => import('@/pages/AskTeewai'),
  '/dentists': () => import('@/pages/DentistDirectory'),
  '/my-dentists': () => import('@/pages/MyDentists'),
  '/blog': () => import('@/pages/Blog'),
  '/help': () => import('@/pages/HelpCenter'),
  '/support': () => import('@/pages/Support'),
  '/terms': () => import('@/pages/Terms'),
  '/privacy': () => import('@/pages/Privacy'),
  '/dentist-dashboard': () => import('@/pages/DentistOverviewPage'),
  '/dentist-patients': () => import('@/pages/DentistWorkspace'),
  '/dentist-pending': () => import('@/pages/DentistPending'),
  '/dentist-appointments': () => import('@/pages/DentistAppointmentsPage'),
  '/dentist-billing': () => import('@/pages/DentistBilling'),
  '/dentist-profile': () => import('@/pages/DentistPracticeProfile'),
  '/dentist-settings': () => import('@/pages/DentistSettings'),
};

const prefetched = new Map();

// Normalize a path to its route key (strips dynamic segments like /results/:id).
function routeKey(path) {
  if (!path) return '/';
  const seg = path.split('/')[1];
  return seg ? '/' + seg : '/';
}

export function prefetchRoute(path) {
  const key = routeKey(path);
  const imp = ROUTE_IMPORTS[key];
  if (!imp) return Promise.resolve();
  if (prefetched.has(key)) return prefetched.get(key);
  const request = imp().catch(() => { prefetched.delete(key); });
  prefetched.set(key, request);
  return request;
}

// Prefetch a list of routes on the browser's idle callback (fallback to a
// short timeout). Used by AppShell on mount to warm the most-likely next pages.
export function prefetchOnIdle(paths, delay = 1200) {
  const connection = navigator.connection;
  if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType)) return () => {};
  let cancelled = false;
  let idleHandle;
  let index = 0;
  let timer;
  const run = async () => {
    if (cancelled || index >= paths.length) return;
    await prefetchRoute(paths[index++]);
    if (!cancelled && index < paths.length) timer = window.setTimeout(schedule, 250);
  };
  const schedule = () => {
    if (cancelled) return;
    if (window.requestIdleCallback) idleHandle = window.requestIdleCallback(run, { timeout: 3000 });
    else timer = window.setTimeout(run, 250);
  };
  timer = window.setTimeout(schedule, delay);
  return () => {
    cancelled = true;
    clearTimeout(timer);
    if (idleHandle !== undefined) window.cancelIdleCallback?.(idleHandle);
  };
}