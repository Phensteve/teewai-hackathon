import { distanceKm, validPoint } from './dentistDirectory.ts';
import { DentalSearchCache } from './dentalInsforge.ts';
const ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://lambert.openstreetmap.de/api/interpreter',
];
export const cacheKey = (p,r) => `${p[0].toFixed(2)},${p[1].toFixed(2)}:${r}`;
// Entity migrated to InsForge — helper imported directly, no client needed.
export async function cachedClinics(point,radius) {
  return (await DentalSearchCache.filter({key:cacheKey(point,radius)},'-updated_date',1))[0] || null;
}
export async function publicClinics(point,radius) {
  const center = point.map(v => Number(v.toFixed(2)));
  const coverage = radius+1; // covers every request within this rounded cell
  const query = `[out:json][timeout:10];(nwr["amenity"="dentist"](around:${coverage*1000},${center.join(',')});nwr["healthcare"="dentist"](around:${coverage*1000},${center.join(',')}););out center tags;`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),12000);
  try {
    const elements = await Promise.any(ENDPOINTS.map(async endpoint => {
      const response = await fetch(endpoint,{
        method:'POST',
        body:`data=${encodeURIComponent(query)}`,
        signal:controller.signal,
        headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded','User-Agent':'TeewaiDentalFinder/2.0 (+https://teewai.base44.app)'},
      });
      if (!response.ok) throw new Error('Clinic map unavailable');
      const data = await response.json();
      if (!Array.isArray(data.elements) || data.remark) throw new Error('Incomplete clinic coverage');
      return data.elements;
    }));
    const unique = new Map();
    for (const e of elements) {
      const latitude = e.lat ?? e.center?.lat, longitude = e.lon ?? e.center?.lon;
      if (!validPoint(latitude,longitude)) continue;
      const t = e.tags || {};
      const clinic_name = String(t.name || t['name:en'] || t.operator || 'Dental clinic').slice(0,160);
      const key = `${clinic_name.toLowerCase()}|${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
      if (unique.has(key)) continue;
      unique.set(key,{id:`osm-${e.type}-${e.id}`,full_name:String(t['dentist:name'] || '').slice(0,160),clinic_name,address:String(t['addr:full'] || [t['addr:housenumber'],t['addr:street'],t['addr:city']].filter(Boolean).join(' ')).slice(0,240),city:String(t['addr:city'] || '').slice(0,100),phone:String(t.phone || t['contact:phone'] || '').slice(0,80),latitude,longitude});
    }
    return [...unique.values()].sort((a,b) => distanceKm(center,[a.latitude,a.longitude])-distanceKm(center,[b.latitude,b.longitude])).slice(0,200);
  } finally {clearTimeout(timer);controller.abort();}
}