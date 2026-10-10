// Lightweight in-memory cache for the current user's subscription record.
//
// The Scan page gates its UI on a subscription fetch every mount, which means
// a spinner + network round-trip on every entry. By warming this cache once
// from AppShell (and refreshing it from Dashboard / Scan after they fetch),
// the Scan page can render instantly from the cached value and refresh in the
// background — no spinner on re-entry.
let cached = null;

export function getCachedSubscription() {
  return cached;
}

export function setCachedSubscription(sub) {
  cached = sub || null;
}