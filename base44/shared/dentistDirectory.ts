export const validPoint = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
export const distanceKm = (a, b) => {
  const r = Math.PI / 180;
  const h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
};
export const addressKey = d => [d.address, d.city].filter(Boolean).join(', ').trim().replace(/\s+/g, ' ').toLowerCase();
export const located = d => validPoint(d.latitude, d.longitude) && d.location_status !== 'no_location' && (!d.geocoded_address || d.geocoded_address === addressKey(d));
export function publicProfile(d) {
  const keys = ['id','user_id','full_name','practice_name','clinic_name','specialization','phone','contact_email','bio','address','city','latitude','longitude','verified','subscription_active','profile_picture','accepting_patients','booking_enabled','location_status'];
  const profile={ ...Object.fromEntries(keys.filter(k => d[k] !== undefined).map(k => [k,d[k]])), clinic_name: d.clinic_name || d.practice_name || d.full_name, isTeewai: !!d.user_id };
  if (!located(d)) {delete profile.latitude;delete profile.longitude;}
  return profile;
}
export async function allProfiles(client) {
  const rows = []; let cursor = null;
  do {
    const page = await client.entities.DentistProfile.list({limit:250,cursor});
    rows.push(...page.items); cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return rows;
}
export async function profilesWithin(client,point,radius) {
  const delta=radius/110;
  const width=Math.min(180,radius/(110*Math.max(0.00001,Math.cos(Math.min(89.999,Math.abs(point[0])+delta)*Math.PI/180))));
  const west=point[1]-width,east=point[1]+width;
  const longitude=width===180 ? {$gte:-180,$lte:180} : west < -180 ? null : east > 180 ? null : {$gte:west,$lte:east};
  const query={latitude:{$gte:Math.max(-90,point[0]-delta),$lte:Math.min(90,point[0]+delta)},location_status:{$ne:'no_location'}};
  if (longitude) query.longitude=longitude;
  else query.$or=west < -180 ? [{longitude:{$gte:west+360,$lte:180}},{longitude:{$gte:-180,$lte:east}}] : [{longitude:{$gte:west,$lte:180}},{longitude:{$gte:-180,$lte:east-360}}];
  const rows=[];let cursor=null;
  do {
    const page=await client.entities.DentistProfile.filter(query,{limit:250,cursor});
    rows.push(...page.items);cursor=page.has_more ? page.next_cursor : null;
  } while(cursor);
  return rows;
}
export function nearbyRows(profiles, clinics, point, radius) {
  const result = new Map();
  for (const d of [...profiles.filter(located).map(publicProfile), ...clinics]) {
    if (!validPoint(d.latitude,d.longitude)) continue;
    const distance = distanceKm(point,[d.latitude,d.longitude]);
    if (distance > radius) continue;
    const key = `${(d.clinic_name || '').toLowerCase()}|${d.latitude.toFixed(3)}|${d.longitude.toFixed(3)}`;
    if (!result.has(key)) result.set(key,{...d,distance});
  }
  // No subscription, rating, name or insertion-order ranking.
  return [...result.values()].sort((a,b) => a.distance-b.distance);
}