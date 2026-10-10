import { useSyncExternalStore } from 'react';
import { CURRENCIES, CURRENCY_ORDER, convert, formatPrice, fetchLiveRates, hasRate } from '@/lib/currency';

const KEY = 'teewai_currency';

let current = (() => {
  try {
    return localStorage.getItem(KEY) || 'USD';
  } catch {
    return 'USD';
  }
})();

const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

// Cross-tab sync only: the `storage` event fires exclusively when ANOTHER
// tab writes the key, so adopting its value can never revert an in-session
// change. (The previous `focus`/`pageshow` resync could revert a just-set
// currency when localStorage.setItem silently failed — common in iframe /
// WebView storage-restricted contexts — because it read the stale stored
// value and overwrote the in-memory one on every focus event.)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    try {
      const stored = e.newValue;
      if (stored && CURRENCIES[stored] && stored !== current) { current = stored; emit(); }
    } catch {}
  });
}

// Track when live rates are fetched so components re-render with updated prices.
let ratesVersion = 0;
const ratesListeners = new Set();
const emitRates = () => { ratesVersion++; ratesListeners.forEach((l) => l()); };

export function setCurrency(code) {
  if (!CURRENCIES[code] || code === current) return;
  current = code;
  try {
    localStorage.setItem(KEY, code);
  } catch {}
  emit();
  // If the new currency needs live rates and they're not available yet, fetch
  // them now so the displayed price updates from the USD fallback to the
  // real converted amount.
  if (code !== 'USD' && code !== 'NGN' && !hasRate(code)) {
    fetchLiveRates(true).then(() => { emitRates(); });
  }
}

// Fetch live rates once on module load so prices are correct immediately.
// emitRates() triggers a re-render once rates land.
fetchLiveRates().then(() => { emitRates(); });

export function useCurrency() {
  const code = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => 'USD',
  );
  // Subscribe to rate changes so prices re-render when live rates load/refresh.
  useSyncExternalStore(
    (cb) => {
      ratesListeners.add(cb);
      return () => ratesListeners.delete(cb);
    },
    () => ratesVersion,
    () => 0,
  );
  return {
    currency: code,
    currencies: CURRENCY_ORDER,
    setCurrency,
    symbol: CURRENCIES[code]?.symbol || '$',
    convert: (usd) => convert(usd, code),
    format: (usd) => formatPrice(usd, code),
    refreshRates: async () => { await fetchLiveRates(true); emitRates(); },
  };
}