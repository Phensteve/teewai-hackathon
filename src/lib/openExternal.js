import { isNativeApp } from '@/lib/isNativeApp';

// The published web app URL — used to build full URLs for paths that should
// open in the device's external browser when running inside the native wrapper.
const WEB_APP_URL = 'https://teewai.base44.app';

// Build a full, absolute URL for an in-app path.
export function externalAppUrl(path = '') {
  const p = path.startsWith('/') ? path : '/' + path;
  return WEB_APP_URL + p;
}

// Open an in-app path in the device's external browser when running inside the
// native APK wrapper. Returns true when the path was opened externally (native),
// false when the caller should handle in-app navigation instead (web).
//
// The Base44 native wrapper routes window.open to a DIFFERENT origin to the
// system browser (this is how the Paystack checkout flow already works), but
// keeps same-origin URLs inside the WebView. So we open the app's custom domain
// (a different host) when one is configured — that forces the system browser.
// When no custom domain is set, we fall back to the app origin; the page still
// loads (in a new window) and the hash-based token handoff signs the user in.
//
// The auth token is passed via the URL hash fragment, which is never sent to
// the server in the HTTP request or leaked via Referer headers, and is cleared
// immediately on the web side (see authTokenFromHash.js).
export function openExternal(path) {
  if (!isNativeApp()) return false;
  const externalHost = window.__TEEWAI_CUSTOM_DOMAIN__ || null;
  let url;
  if (externalHost) {
    const p = path.startsWith('/') ? path : '/' + path;
    url = `https://${externalHost}${p}`;
  } else {
    url = externalAppUrl(path);
  }
  try {
    const token = localStorage.getItem('base44_access_token');
    if (token) url += `#auth_token=${encodeURIComponent(token)}`;
  } catch {}
  window.open(url, '_blank');
  return true;
}