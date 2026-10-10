// Trend graph aggregation — maps raw scans to per-preset series.
//
// Aggregation rule: LAST SCAN OF BUCKET. The last real scan in each time
// bucket is the point, consistent with the simulation's "last scan is the
// truth anchor" philosophy. Averages of shade scores mid-treatment are
// misleading; the last scan reflects where the user actually was at the end
// of that bucket. Day is the exception: one point per scan (no aggregation),
// so individual scans are never hidden.

const DAY_MS = 86400000;

export const PRESETS = [
  { id: 'day', label: 'Day', bucket: 'scan' },
  { id: 'week', label: 'Week', bucket: 'day' },
  { id: 'month', label: 'Month', bucket: 'day' },
  { id: '3m', label: '3M', bucket: 'week' },
  { id: '6m', label: '6M', bucket: 'week' },
  { id: '9m', label: '9M', bucket: 'week' },
  { id: 'year', label: 'Year', bucket: 'month' },
  { id: 'all', label: 'Lifetime', bucket: 'month' },
];

// Guests see Day and Week only; longer presets are locked teasers.
export const GUEST_PRESETS = ['day', 'week'];

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

function bucketKey(date, bucket) {
  const d = new Date(date);
  if (bucket === 'day') return startOfDay(d).getTime();
  if (bucket === 'week') return startOfWeek(d).getTime();
  if (bucket === 'month') return startOfMonth(d).getTime();
  return d.getTime();
}

// Window start for a preset, relative to `now`.
export function presetWindowStart(presetId, now = new Date()) {
  if (presetId === 'day') return startOfDay(now).getTime();
  if (presetId === 'week') { const s = startOfDay(now); s.setDate(s.getDate() - 6); return s.getTime(); }
  if (presetId === 'month') { const s = startOfDay(now); s.setDate(s.getDate() - 29); return s.getTime(); }
  if (presetId === '3m') return now.getTime() - 90 * DAY_MS;
  if (presetId === '6m') return now.getTime() - 182 * DAY_MS;
  if (presetId === '9m') return now.getTime() - 273 * DAY_MS;
  if (presetId === 'year') { const s = new Date(now); s.setFullYear(s.getFullYear() - 1); s.setHours(0, 0, 0, 0); return s.getTime(); }
  return 0; // all time
}

// Build the series for a preset. scans = newest-first array.
// Returns array of { t, score, scan } oldest-first.
export function buildSeries(scans, presetId, now = new Date()) {
  const preset = PRESETS.find(p => p.id === presetId) || PRESETS[0];
  const windowStart = presetWindowStart(presetId, now);
  const inWindow = scans
    .filter(s => s.score != null && new Date(s.created_date).getTime() >= windowStart)
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  if (preset.bucket === 'scan') {
    return inWindow.map(s => ({ t: new Date(s.created_date).getTime(), score: s.score, scan: s }));
  }
  // Last scan of each bucket (inWindow is oldest-first, so later overwrites).
  const buckets = new Map();
  inWindow.forEach(s => {
    const key = bucketKey(s.created_date, preset.bucket);
    buckets.set(key, { t: new Date(s.created_date).getTime(), score: s.score, scan: s });
  });
  return [...buckets.values()].sort((a, b) => a.t - b.t);
}

// Global y-domain from ALL scans — consistent across presets so the line's
// vertical position stays comparable when switching periods.
export function globalYDomain(scans) {
  const scores = scans.filter(s => s.score != null).map(s => s.score);
  if (!scores.length) return [0, 100];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const pad = Math.max(4, (max - min) * 0.15);
  return [Math.max(0, Math.floor(min - pad)), Math.min(100, Math.ceil(max + pad))];
}