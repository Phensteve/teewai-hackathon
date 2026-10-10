import { validPoint } from './dentistDirectory.ts';
import { DentalGeocodeCache, DentalGeocoderState } from './dentalInsforge.ts';
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));

// A database compare-and-set serializes ALL instances, not just one worker.
// Nominatim: one thread, at most one request/second, identified and cached.
// Entities migrated to InsForge — helpers imported directly, no client needed.
export async function geocode(query) {
  const key = query.trim().replace(/\s+/g,' ').toLowerCase();
  if (!key || key.length > 240) return null;
  const saved = await DentalGeocodeCache.filter({key},'created_date',1);
  if (saved.length) return saved[0].position?.length === 2 ? saved[0].position : null;
  const state = (await DentalGeocoderState.filter({name:'nominatim'},'created_date',1))[0];
  if (!state) throw new Error('Location search is not configured');
  const deadline = Date.now()+6000;
  let reserved = false;
  while (Date.now() < deadline) {
    const now = Date.now();
    const claim = await DentalGeocoderState.updateMany({id:state.id,next_allowed_at:{$lte:now}},{$set:{next_allowed_at:now+20000}});
    if (claim.updated === 1) {reserved=true;break;}
    await pause(250);
  }
  if (!reserved) throw new Error('Area search is busy. Please retry in a moment.');
  try {
    // Recheck after waiting: another request may have cached this same address.
    const existing = await DentalGeocodeCache.filter({key},'created_date',1);
    if (existing.length) return existing[0].position?.length === 2 ? existing[0].position : null;
    const url = new URL(state.endpoint);
    if (url.protocol !== 'https:') throw new Error('Invalid geocoder configuration');
    url.search = new URLSearchParams({q:query,format:'jsonv2',limit:'1'}).toString();
    const response = await fetch(url,{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'TeewaiDentalFinder/2.0 (+https://teewai.base44.app)','Accept':'application/json'}});
    if (!response.ok) throw new Error('Area search is temporarily unavailable');
    const rows = await response.json();
    const lat = Number(rows[0]?.lat), lon = Number(rows[0]?.lon);
    const position = validPoint(lat,lon) ? [lat,lon] : null;
    await DentalGeocodeCache.create({key,query,position:position || [],checked_at:new Date().toISOString()});
    return position;
  } finally {
    await DentalGeocoderState.update(state.id,{next_allowed_at:Date.now()+1100});
  }
}