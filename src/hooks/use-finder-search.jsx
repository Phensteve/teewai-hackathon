import { useEffect, useRef, useState } from 'react';
import { finderRequest } from '@/lib/nearbyDentists';
import { manualMatches, RADII, DEFAULT_RADIUS_KM, distanceKm } from '@/lib/dentistGeo';
import { readBlock, writeBlock } from '@/lib/dentalCellCache';
import { unrufld } from '@/api/unrufldClient';
const finderIndex=async args => {
  const res=await unrufld.functions.invoke('dentalIndex',args);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
};
// Warm the 4 neighbouring blocks (~20 km away) while the browser is idle.
const prefetched=new Set();
function prefetchNeighbours(p) {
  const idle=window.requestIdleCallback || (fn => setTimeout(fn,1500));
  idle(() => [[0.18,0],[-0.18,0],[0,0.18],[0,-0.18]].forEach(([a,b]) => {
    const lat=p[0]+a,lon=p[1]+b,key=`${lat.toFixed(2)},${lon.toFixed(2)}`;
    if (prefetched.has(key) || readBlock(lat,lon)) return;
    prefetched.add(key);
    finderIndex({lat,lon,prefetch:true}).then(d => writeBlock(d.readyCells,d.rows)).catch(() => {});
  }));
}
export default function useFinderSearch(location) {
  const [requestedRadius,setRequestedRadius]=useState(DEFAULT_RADIUS_KM);
  const [radius,setRadius]=useState(DEFAULT_RADIUS_KM);
  const [dentists,setDentists]=useState([]);
  const [profiles,setProfiles]=useState([]);
  const [query,setQuery]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [generation,setGeneration]=useState(0);
  const [firstResultsMs,setFirstResultsMs]=useState(null);
  const opened=useRef(performance.now());
  const first=useRef(false);
  const point=location.origin;
  useEffect(() => {
    let active=true;
    finderRequest({op:'browse'}).then(data => {if(active) setProfiles(data.dentists);}).catch(() => {if(active) setError('Manual dentist browsing is unavailable. You can still search an area.');});
    return () => {active=false;};
  },[generation]);
  useEffect(() => {
    if (!point) {setBusy(false);return;}
    let active=true;
    const update=data => {
      if (!active) return;
      setDentists(data.dentists);setRadius(data.radiusKm);
      if (data.dentists.length && !first.current) {first.current=true;setFirstResultsMs(Math.round(performance.now()-opened.current));}
    };
    const run=async () => {
      setBusy(true);setError('');setNotice('');setRadius(requestedRadius);setDentists([]);
      try {
        // Instant path: device cell cache, then the pre-built grid index. The
        // live map search below only runs for cold areas or empty results.
        if (requestedRadius<=10) {
          const within=rows => rows.map(r => ({...r,distance:distanceKm(point,[r.latitude,r.longitude])})).filter(r => r.distance<=requestedRadius).sort((a,b) => a.distance-b.distance);
          const cached=readBlock(point[0],point[1]);
          if (cached?.length) update({dentists:within(cached),radiusKm:requestedRadius});
          const idx=await finderIndex({lat:point[0],lon:point[1]}).catch(() => null);
          if (!active) return;
          if (idx) {
            writeBlock(idx.readyCells,idx.rows);
            if (idx.coverage!=='none') {
              const list=within(idx.rows);
              update({dentists:list,radiusKm:requestedRadius});
              prefetchNeighbours(point);
              if (list.length) return;
            }
          }
        }
        for (const current of RADII.filter(r => r>=requestedRadius)) {
          if (!active) return;
          setRadius(current);
          if (current>requestedRadius) setNotice(`No dentists within ${requestedRadius} km · searching within ${current} km…`);
          const args={lat:point[0],lon:point[1],radiusKm:current};
          // Cached/registered clinics render without waiting for the public map.
          const live=finderRequest({...args,op:'nearby',refresh:generation>0}).catch(e => ({error:e.message}));
          const cached=await finderRequest({...args,op:'cached'});
          if (!active) return;
          update(cached);
          const data=await live;
          if (data.error) throw new Error(data.error);
          if (!active) return;
          update(data);
          if (data.publicUnavailable) {
            setError(data.dentists.length ? 'Public clinic search is unavailable; showing registered or saved clinics. Retry to update coverage.' : 'Public clinic search is temporarily unavailable. Retry or browse by name or area.');
            setNotice('');break; // Failure is NOT evidence that there are zero clinics.
          }
          if (data.dentists.length) {
            setNotice(current>requestedRadius ? `No dentists within ${requestedRadius} km · showing the nearest within ${current} km` : '');break;
          }
          if (current===50) setNotice('No mapped dentists found within 50 km. Try another area or search a dentist by name.');
        }
      } catch {if(active) setError('Dentist search could not finish. Retry or enter an area; manual search remains available.');}
      finally {if(active) setBusy(false);}
    };
    run();return () => {active=false;};
  },[point?.[0],point?.[1],requestedRadius,generation]);
  const rows=query.trim() ? manualMatches(profiles,dentists,query,point) : dentists;
  return {...location,rows,query,setQuery,radius,setRequestedRadius,busy,error,notice,firstResultsMs,refresh:() => setGeneration(n=>n+1)};
}