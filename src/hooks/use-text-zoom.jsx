import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'teewai_text_zoom';
export const ZOOM_LEVELS = [25, 75, 100, 125, 150];
const DEFAULT = 100;

let currentLevel = DEFAULT;
const listeners = new Set();

// Scale the root font-size. Tailwind uses rem units everywhere, so this
// proportionally scales text, spacing, icons — the entire UI — exactly like
// browser zoom. The app is already responsive, so all layouts adapt.
function applyZoom(level) {
  const px = (16 * level) / 100;
  document.documentElement.style.fontSize = `${px}px`;
}

// Apply saved zoom on module load (prevents flash when the hook imports).
try {
  const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  if (ZOOM_LEVELS.includes(saved)) {
    currentLevel = saved;
    applyZoom(saved);
  }
} catch { /* storage unavailable */ }

function emit() { listeners.forEach((fn) => fn()); }

export function setTextZoom(level) {
  if (!ZOOM_LEVELS.includes(level)) return;
  currentLevel = level;
  try { localStorage.setItem(STORAGE_KEY, String(level)); } catch {}
  applyZoom(level);
  emit();
}

export function useTextZoom() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => currentLevel
  );
}