export const DEFAULT_RADIUS_KM = 10;
export const RADII = [5, 10, 25, 50];
export const hasCoordinates = d => Number.isFinite(d?.latitude) && Number.isFinite(d?.longitude) && Math.abs(d.latitude) <= 90 && Math.abs(d.longitude) <= 180 && d.location_status !== 'no_location';
export const validPosition = p => Array.isArray(p) && p.length === 2 && hasCoordinates({latitude:p[0],longitude:p[1]});
export function distanceKm(a,b) {
  const r = Math.PI / 180;
  const h = Math.sin((b[0]-a[0])*r/2)**2 + Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;
  return 12742*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function manualMatches(profiles, nearby, query, origin) {
  const unique = new Map([...profiles,...nearby].map(d => [d.id,d]));
  const q = query.trim().toLowerCase();
  return [...unique.values()].filter(d => [d.full_name,d.practice_name,d.clinic_name,d.address,d.city].some(v => String(v || '').toLowerCase().includes(q)))
    .map(d => ({...d,distance:origin && hasCoordinates(d) ? distanceKm(origin,[d.latitude,d.longitude]) : null}))
    .sort((a,b) => (a.distance ?? Infinity)-(b.distance ?? Infinity));
}