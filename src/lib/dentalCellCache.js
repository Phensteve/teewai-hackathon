// Device cache for the grid-cell dental index. Cells match the server (0.05°).
// Rows are stored per cell, so any nearby origin or radius renders instantly
// from cache once its block has been seen or prefetched.
const CELL = 0.05;
const KEY = 'teewai_dental_cells_v1';
const MAX_CELLS = 600;
const FRESH_MS = 3 * 86400000;

export const cellOf = (lat, lon) => `${Math.floor(lat / CELL)}:${Math.floor(lon / CELL)}`;
export function blockCells(lat, lon, radiusKm = 10) {
  const latRing = Math.ceil(radiusKm / (CELL * 111));
  const lonRing = Math.ceil(radiusKm / (CELL * 111 * Math.max(0.2, Math.cos(lat * Math.PI / 180))));
  const ci = Math.floor(lat / CELL), cj = Math.floor(lon / CELL);
  const out = [];
  for (let i = -latRing; i <= latRing; i++) for (let j = -lonRing; j <= lonRing; j++) out.push(`${ci + i}:${cj + j}`);
  return out;
}
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

// Returns cached rows for the block, or null when any cell is missing/stale.
export function readBlock(lat, lon) {
  const store = load();
  const rows = [];
  for (const c of blockCells(lat, lon)) {
    const entry = store[c];
    if (!entry || Date.now() - entry.t > FRESH_MS) return null;
    rows.push(...entry.rows);
  }
  return rows;
}
export function writeBlock(readyCells, rows) {
  const store = load();
  const byCell = Object.fromEntries(readyCells.map(c => [c, []]));
  rows.forEach(r => { if (byCell[r.cell]) byCell[r.cell].push(r); });
  const t = Date.now();
  Object.entries(byCell).forEach(([c, list]) => { store[c] = { t, rows: list }; });
  const keys = Object.keys(store);
  if (keys.length > MAX_CELLS) keys.sort((a, b) => store[a].t - store[b].t).slice(0, keys.length - MAX_CELLS).forEach(k => delete store[k]);
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota: cache is optional */ }
}