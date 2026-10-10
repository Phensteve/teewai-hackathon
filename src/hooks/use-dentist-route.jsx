import { useEffect, useState } from 'react';
import { hasCoordinates, validPosition } from '@/lib/dentistGeo';

export default function useDentistRoute(origin, dentist) {
  const destination = hasCoordinates(dentist) ? [dentist.latitude,dentist.longitude] : null;
  const key = validPosition(origin) && destination ? `${origin.join(',')};${destination.join(',')}` : '';
  const [result,setResult] = useState(null);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    let active = true;
    const fallback = {key,path:[origin,destination],kind:'straight',status:'fallback'};
    setResult({...fallback,status:'loading'});
    const timer = setTimeout(() => {controller.abort(); if (active) setResult(fallback);},3000);
    const points = `${origin[1]},${origin[0]};${destination[1]},${destination[0]}`;
    fetch(`https://router.project-osrm.org/route/v1/driving/${points}?overview=full&geometries=geojson`,{signal:controller.signal})
      .then(async response => {
        if (!response.ok) throw new Error('Route unavailable');
        const data = await response.json();
        const road = data.routes?.[0];
        const path = road?.geometry?.coordinates?.map(p => [p[1],p[0]]);
        if (data.code !== 'Ok' || !path?.length || !path.every(validPosition)) throw new Error('No road route');
        if (active && !controller.signal.aborted) setResult({key,path,kind:'road',status:'ready',distance:road.distance/1000,minutes:Math.max(1,Math.round(road.duration/60))});
      }).catch(() => {if (active) setResult(fallback);})
      .finally(() => clearTimeout(timer));
    return () => {active=false; clearTimeout(timer); controller.abort();};
  },[key]);
  if (!key) return null;
  return result?.key === key ? result : {key,path:[origin,destination],kind:'straight',status:'loading'};
}