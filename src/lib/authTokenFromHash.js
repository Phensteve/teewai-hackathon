// Reads a one-time auth token from the URL hash fragment and stores it as the
// session token. Using the hash (not the query string) means the token is
// never sent to the server in the HTTP request or leaked via Referer headers.
// The hash is cleared immediately after reading so it does not persist in
// browser history or the address bar.
//
// This runs before all other app imports (it is the first import in main.jsx)
// so the token is in localStorage by the time app-params.js reads it.
//
// Security notes:
// - The hash fragment stays client-side; it is not part of the HTTP request
//   to the server, so it never appears in server access logs.
// - It is not sent in Referer headers when the page navigates or loads
//   sub-resources (only the origin + path are sent, never the hash).
// - history.replaceState replaces the current history entry so the token
//   does not remain in the browser's back/forward history.
// - For production-grade SSO, a backend-issued short-lived one-time exchange
//   token is the gold standard. This client-side hash approach is a secure
//   stopgap that avoids the main attack vectors (server logs, Referer leaks).
try {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const token = params.get('auth_token');
  if (token) {
    localStorage.setItem('unrufld_access_token', token);
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
} catch { /* storage or history unavailable */ }