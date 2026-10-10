const KEY = 'teewai_native_app';

// True when running inside the packaged APK / native WebView (not the mobile
// browser). Detection: Android WebView user-agent marker, standalone display
// mode (TWA), or an explicit ?platform=apk launch param — sticky once seen.
export function isNativeApp() {
  if (typeof window === 'undefined') return false;
  // Never treat the Base44 editor / preview (running inside an iframe) as
  // native. A sticky localStorage flag from a prior ?platform=apk test would
  // otherwise make every page think it's in the APK, causing the Landing page
  // to redirect via <Navigate> and potentially losing Router context.
  try {
    if (window.self !== window.top) return false;
  } catch { /* cross-origin — could be native */ }
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('platform') === 'apk' || params.get('apk') === '1') {
      localStorage.setItem(KEY, '1');
      return true;
    }
    if (localStorage.getItem(KEY) === '1') return true;
  } catch { /* storage unavailable */ }
  const ua = navigator.userAgent || '';
  const androidWebView = /Android/i.test(ua) && /;\s*wv\)/i.test(ua);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true;
  const detected = androidWebView || standalone;
  if (detected) {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  }
  return detected;
}