import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { geocode } from '../../shared/dentalGeocoder.ts';
import { allProfiles, addressKey, validPoint } from '../../shared/dentistDirectory.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({error:'Unauthorized'},{status:401});
    const {profileId,backfill=false} = await req.json();
    if (backfill && user.role !== 'admin') return Response.json({error:'Forbidden'},{status:403});
    let profiles;
    if (backfill) profiles=(await allProfiles(base44.asServiceRole)).filter(d => d.geocoded_address !== addressKey(d)).slice(0,25);
    else {
      if (typeof profileId !== 'string' || !profileId) return Response.json({error:'Missing profile'},{status:400});
      const d=await base44.entities.DentistProfile.get(profileId);
      if (!d || (user.role !== 'admin' && d.user_id !== user.id && d.created_by_id !== user.id)) return Response.json({error:'Forbidden'},{status:403});
      profiles=[d];
    }
    const results=[];
    for (const d of profiles) {
      const address=addressKey(d);
      if (d.geocoded_address === address) {results.push({id:d.id,status:d.location_status,skipped:true});continue;}
      let position = !d.geocoded_address && validPoint(d.latitude,d.longitude) ? [d.latitude,d.longitude] : null;
      if (!position && d.address?.trim()) {
        try {position=await geocode(base44.asServiceRole,[d.address,d.city].filter(Boolean).join(', '));}
        catch {position=null;}
      }
      // Never attach the old address's result to a profile edited mid-request.
      const latest=await base44.asServiceRole.entities.DentistProfile.get(d.id);
      if (addressKey(latest) !== address) {results.push({id:d.id,status:'address_changed'});continue;}
      const metadata={geocoded_address:address,geocoded_at:new Date().toISOString(),location_status:position ? 'located' : 'no_location'};
      if (position) await base44.asServiceRole.entities.DentistProfile.update(d.id,{...metadata,latitude:position[0],longitude:position[1]});
      else await base44.asServiceRole.entities.DentistProfile.updateMany({id:d.id},{$set:metadata,$unset:{latitude:'',longitude:''}});
      results.push({id:d.id,status:metadata.location_status});
    }
    return Response.json({processed:results.length,results,hasMore:backfill && profiles.length===25});
  } catch(error) {return Response.json({error:error.message},{status:500});}
}