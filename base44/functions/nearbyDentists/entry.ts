import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { allProfiles, profilesWithin, nearbyRows, publicProfile, validPoint } from '../../shared/dentistDirectory.ts';
import { waitUntil } from 'base44:runtime';
import { geocode } from '../../shared/dentalGeocoder.ts';
import { cachedClinics, cacheKey, publicClinics } from '../../shared/publicDentalClinics.ts';
import { DentalSearchCache } from '../../shared/dentalInsforge.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({error:'Unauthorized'},{status:401});
    const body = await req.json();
    if (body.op === 'geocode') {
      const query = typeof body.query === 'string' ? body.query.trim() : '';
      if (!query || query.length > 200) return Response.json({error:'Enter an area or city'},{status:400});
      return Response.json({position:await geocode(query)});
    }
    if (body.op === 'browse') return Response.json({dentists:(await allProfiles(base44)).map(publicProfile)});
    const {lat,lon,radiusKm=5} = body;
    if (!validPoint(lat,lon) || ![5,10,25,50].includes(radiusKm)) return Response.json({error:'Choose a valid location and a 5, 10, 25 or 50 km range'},{status:400});
    const point = [lat,lon];
    const started = Date.now();
    const [profiles,saved] = await Promise.all([profilesWithin(base44,point,radiusKm),cachedClinics(point,radiusKm)]);
    const fresh = saved && new Date(saved.expires_at).getTime() > Date.now();
    if (body.op === 'cached' || (fresh && !body.refresh)) {
      return Response.json({dentists:nearbyRows(profiles,saved?.clinics || [],point,radiusKm),radiusKm,cached:!!fresh,stale:!!saved && !fresh,source:'teewai + OpenStreetMap',lookupMs:Date.now()-started});
    }
    let clinics;
    try {clinics=await publicClinics(point,radiusKm);}
    catch {
      return Response.json({dentists:nearbyRows(profiles,saved?.clinics || [],point,radiusKm),radiusKm,publicUnavailable:true,stale:!!saved,cached:false,lookupMs:Date.now()-started});
    }
    const data={key:cacheKey(point,radiusKm),clinics,expires_at:new Date(Date.now()+86400000).toISOString()};
    // Persist off the response path; returning clinics never waits for storage.
    waitUntil(saved ? DentalSearchCache.update(saved.id,data) : DentalSearchCache.create(data));
    return Response.json({dentists:nearbyRows(profiles,clinics,point,radiusKm),radiusKm,cached:false,source:'teewai + OpenStreetMap',lookupMs:Date.now()-started});
  } catch(error) {
    return Response.json({error:error.message || 'Clinic search could not finish'},{status:500});
  }
}