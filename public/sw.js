// teewai offline service worker — APK / native only.
// Registered from index.html when an Android WebView or ?platform=apk is
// detected. Caches the app shell so the app opens and renders without a
// connection, and serves /offline.html (branded) when a navigation request
// fails entirely — preventing the WebView's default "no connection" error
// page (which leaks raw i18n keys like ErrorScreen.NO_CONNECTION_TITLE).

const CACHE_VERSION = 'teewai-shell-v4';
const OFFLINE_URL = '/offline.html';

// App-shell assets to pre-cache on install. Keeps the cache small — the
// JS/CSS chunks are cached on first fetch (stale-while-revalidate).
const SHELL_ASSETS = [
  '/',
  '/offline.html',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // Use addAll but tolerate individual failures (some assets may 404)
      Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET; ignore cross-origin (API calls, analytics, etc.)
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests (page loads) — network-first with offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache the latest index.html for next time
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() =>
          // Network failed — try the cached app shell
          caches.match('/index.html').then((cached) =>
            cached || caches.match(OFFLINE_URL)
          ).then((offline) => offline || caches.match('/'))
            .then((page) => page || Response.error())
        )
    );
    return;
  }

  // Vite dev/preview assets — never cache-serve these. Vite re-optimizes
  // dependency chunks on every change (new ?v= hashes); a stale cached
  // React chunk mixed with a fresh react-dom chunk produces "Cannot read
  // properties of null (reading 'useState')" because the two copies are
  // from different optimization runs. These must always hit the network.
  const isViteAsset =
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/.vite/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh');
  if (isViteAsset) return;

  // Static assets — stale-while-revalidate
  if (req.destination === 'script' || req.destination === 'style' ||
      req.destination === 'font' || req.destination === 'image') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
