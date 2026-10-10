import '@/lib/authTokenFromHash.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import installMobileZoom from '@/lib/mobileZoom'


// Apply the theme before first render to avoid a flash. With no saved
// preference we follow the OS setting (matches useTheme in ThemeToggle).
// Guarded: some older Android WebViews lack matchMedia, and an uncaught throw
// here would abort the entire boot (white screen) before React mounts.
try {
  const savedTheme = localStorage.getItem('teewai-theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
} catch { /* storage / matchMedia unavailable — default theme */ }

// Global error handlers — catch unhandled promise rejections and runtime
// errors so a single failure never silently breaks the app. Major apps
// (Duolingo, Calm) all wire these to reporting + graceful fallback.
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error || event.message);
});

const stopMobileZoom = installMobileZoom();
if (import.meta.hot) import.meta.hot.dispose(stopMobileZoom);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Register the service worker for offline app-shell access — APK only. The
// web app stays online-first; the native WebView caches the shell so it opens
// and renders without a connection. Strict APK-only detection (Android
// WebView UA or ?platform=apk param) — not the sticky localStorage flag,
// which would incorrectly register in the web app at the same origin.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  var _ua = navigator.userAgent || '';
  var _isAndroidWV = /Android/i.test(_ua) && /;\s*wv\)/i.test(_ua);
  var _params = new URLSearchParams(window.location.search);
  var _hasParam = _params.get('platform') === 'apk' || _params.get('apk') === '1';
  if (_isAndroidWV || _hasParam) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}