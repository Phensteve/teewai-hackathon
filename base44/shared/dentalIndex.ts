// Grid-cell dental index ("hidden dentist" engine).
//
// Earth is split into fixed 0.05° cells (~5.5 km). Every dental unit is stored
// with its cell key, so a lookup is a key match on ~25 cells instead of live
// map calls or distance math over the whole table. Ingestion runs in the
// background: OpenStreetMap health facilities in broad categories are pulled,
// classified into 3 tiers, and scored with
//   confidence = 0.5 * category + 0.3 * semantic(web | AI) + 0.2 * description
import { distanceKm, validPoint } from './dentistDirectory.ts';
import { DentalCoverage, DentalUnit } from './dentalInsforge.ts';

export const CELL = 0.05;
export const STALE_MS = 14 * 86400000;
const KEEP_THRESHOLD = 0.45;
const ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];
const DENTAL_RE = /\b(dental|dentists?|dentistry|orthodont\w*|endodont\w*|periodont\w*|prosthodont\w*|oral|teeth|tooth|maxillo\w*|dentures?|root canal|braces)\b/i;
const FACILITY = new Set(['clinic', 'doctors', 'doctor', 'hospital', 'centre']);

export const cellOf = (lat: number, lon: number) => `${Math.floor(lat / CELL)}:${Math.floor(lon / CELL)}`;

export function blockCells(lat: number, lon: number, radiusKm: number) {
  const latRing = Math.ceil(radiusKm / (CELL * 111));
  const lonRing = Math.ceil(radiusKm / (CELL * 111 * Math.max(0.2, Math.cos(lat * Math.PI / 180))));
  const [ci, cj] = [Math.floor(lat / CELL), Math.floor(lon / CELL)];
  const cells: string[] = [];
  for (let i = -latRing; i <= latRing; i++) for (let j = -lonRing; j <= lonRing; j++) cells.push(`${ci + i}:${cj + j}`);
  return cells;
}

function bboxOf(cells: string[]) {
  const idx = cells.map(c => c.split(':').map(Number));
  const s = Math.min(...idx.map(x => x[0])) * CELL, n = (Math.max(...idx.map(x => x[0])) + 1) * CELL;
  const w = Math.min(...idx.map(x => x[1])) * CELL, e = (Math.max(...idx.map(x => x[1])) + 1) * CELL;
  return [s, w, n, e].map(v => Number(v.toFixed(5)));
}

async function overpass(bbox: number[]) {
  const b = bbox.join(',');
  const q = `[out:json][timeout:25];(nwr["amenity"~"^(dentist|clinic|doctors|hospital)$"](${b});nwr["healthcare"~"^(dentist|clinic|hospital|doctor|centre)$"](${b});nwr["healthcare:speciality"~"dent|orthodont|oral",i](${b}););out center tags;`;
  return await Promise.any(ENDPOINTS.map(async url => {
    const r = await fetch(url, {
      method: 'POST', body: `data=${encodeURIComponent(q)}`, signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'TeewaiDentalIndex/1.0 (+https://teewai.base44.app)' },
    });
    if (!r.ok) throw new Error('overpass ' + r.status);
    const d = await r.json();
    if (!Array.isArray(d.elements) || d.remark) throw new Error('incomplete');
    return d.elements;
  }));
}

// Tier 1 / candidate split from map tags alone.
function baseClassify(t: any) {
  const name = String(t.name || t['name:en'] || t.operator || '');
  const spec = String(t['healthcare:speciality'] || '');
  const desc = [t.description, t.note, spec].filter(Boolean).join(' ');
  const type = t.amenity || t.healthcare || 'clinic';
  if (t.amenity === 'dentist' || t.healthcare === 'dentist' || DENTAL_RE.test(spec) || DENTAL_RE.test(name)) {
    return { tier: 1, category: 1, desc: 1, type, name, signals: ['explicit dental tag or name'] };
  }
  if (!FACILITY.has(t.amenity) && !FACILITY.has(t.healthcare)) return null;
  return { tier: 0, category: type === 'hospital' ? 0.5 : 0.4, desc: DENTAL_RE.test(desc) ? 1 : 0, type, name, signals: [] as string[] };
}

async function websiteScore(url: string) {
  try {
    const r = await fetch(url.startsWith('http') ? url : `https://${url}`, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'TeewaiDentalIndex/1.0' } });
    if (!r.ok) return 0;
    const text = (await r.text()).slice(0, 80000).replace(/<[^>]+>/g, ' ');
    const hits = new Set((text.match(new RegExp(DENTAL_RE.source, 'gi')) || []).map(h => h.toLowerCase()));
    return Math.min(1, hits.size / 3);
  } catch { return 0; }
}

// Semantic stage: one AI call rates how likely each generic facility offers dental care.
async function semanticScores(client: any, items: { i: number; name: string; type: string; city: string }[]) {
  if (!items.length) return new Map<number, number>();
  const res = await client.integrations.Core.InvokeLLM({
    prompt: `You classify health facilities. For each facility, estimate the probability (0 to 1) that it offers dental care (a dentist, dental unit or oral care service), using its name, facility type and city. General and teaching hospitals in Nigeria and Africa often have a dental department. Small private clinics and pharmacies usually do not unless the name suggests it. Be calibrated, do not guess high without reason.\n\nFacilities (JSON):\n${JSON.stringify(items)}`,
    response_json_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { i: { type: 'number' }, p: { type: 'number' } } } } } },
  }).catch(() => ({ items: [] }));
  return new Map<number, number>((res?.items || []).map((x: any) => [x.i, Math.max(0, Math.min(1, Number(x.p) || 0))]));
}

export async function ingestCells(client: any, cells: string[]) {
  const wanted = new Set(cells);
  const elements = await overpass(bboxOf(cells));
  const rows: any[] = [];
  const seen = new Set<string>();
  for (const e of elements) {
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (!validPoint(lat, lon) || !wanted.has(cellOf(lat, lon))) continue;
    const t = e.tags || {};
    const c = baseClassify(t);
    if (!c) continue;
    const key = `${c.name.toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ c, t, lat, lon, id: `osm-${e.type}-${e.id}`, website: String(t.website || t['contact:website'] || '') });
  }
  // Semantic enrichment for generic facilities (hospitals first, capped per run).
  const cands = rows.filter(r => r.c.tier === 0).sort((a, b) => b.c.category - a.c.category).slice(0, 120);
  const webTargets = cands.filter(r => r.website).slice(0, 8);
  const webRes = await Promise.allSettled(webTargets.map(r => websiteScore(r.website)));
  webTargets.forEach((r, k) => { r.web = webRes[k].status === 'fulfilled' ? webRes[k].value : 0; });
  const ai = new Map<number, number>();
  for (let k = 0; k < cands.length; k += 60) {
    const batch = cands.slice(k, k + 60).map((r, j) => ({ i: k + j, name: r.c.name || 'Unnamed', type: r.c.type, city: String(r.t['addr:city'] || '') }));
    (await semanticScores(client, batch)).forEach((p, i) => ai.set(i, p));
  }
  cands.forEach((r, i) => { r.ai = ai.get(i) || 0; });

  const now = new Date().toISOString();
  const units = rows.flatMap(r => {
    let tier = 1, conf = 1, signals = r.c.signals;
    if (r.c.tier === 0) {
      const web = r.web || 0, semantic = Math.max(web, r.ai || 0);
      conf = 0.5 * r.c.category + 0.3 * semantic + 0.2 * r.c.desc;
      if (conf < KEEP_THRESHOLD) return [];
      tier = web > 0 ? 2 : 3;
      signals = [web > 0 && 'website mentions dental services', r.ai >= 0.5 && 'AI rates dental care likely', r.c.desc && 'description mentions dental'].filter(Boolean);
    }
    const t = r.t;
    return [{
      source_id: r.id, cell: cellOf(r.lat, r.lon), latitude: r.lat, longitude: r.lon,
      clinic_name: (r.c.name || 'Dental clinic').slice(0, 160), full_name: String(t['dentist:name'] || '').slice(0, 160),
      address: String(t['addr:full'] || [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ')).slice(0, 240),
      city: String(t['addr:city'] || '').slice(0, 100), phone: String(t.phone || t['contact:phone'] || '').slice(0, 80),
      website: r.website.slice(0, 240), facility_type: r.c.type, dental_tier: tier,
      dental_confidence: Math.round(conf * 100) / 100, signals, refreshed_at: now,
    }];
  });

  await DentalUnit.deleteMany({ cell: { $in: cells } });
  for (let k = 0; k < units.length; k += 200) await DentalUnit.bulkCreate(units.slice(k, k + 200));
  const counts: Record<string, number> = {};
  units.forEach(u => { counts[u.cell] = (counts[u.cell] || 0) + 1; });
  const existing = await DentalCoverage.filter({ cell: { $in: cells } });
  const byCell = new Map(existing.map((x: any) => [x.cell, x]));
  const updates = existing.map((x: any) => ({ id: x.id, status: 'ready', ingested_at: now, unit_count: counts[x.cell] || 0 }));
  if (updates.length) await DentalCoverage.bulkUpdate(updates);
  const fresh = cells.filter(c => !byCell.has(c)).map(c => ({ cell: c, status: 'ready', ingested_at: now, unit_count: counts[c] || 0 }));
  if (fresh.length) await DentalCoverage.bulkCreate(fresh);
  return { cells: cells.length, units: units.length, scanned: rows.length, aiChecked: cands.length };
}

// Groups pending cells into neighbourhoods so each Overpass call stays small.
export function groupCells(cells: string[]) {
  const left = [...cells];
  const groups: string[][] = [];
  while (left.length) {
    const [a, b] = left[0].split(':').map(Number);
    const g = left.filter(c => { const [x, y] = c.split(':').map(Number); return Math.abs(x - a) <= 4 && Math.abs(y - b) <= 4; });
    groups.push(g);
    g.forEach(c => left.splice(left.indexOf(c), 1));
  }
  return groups;
}

export const unitDistance = (p: number[], u: any) => distanceKm(p, [u.latitude, u.longitude]);