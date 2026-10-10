import { useEffect, useRef, useState } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { requestDeviceLocation } from '@/lib/deviceLocation';
import { geocodeCity } from '@/lib/nearbyDentists';
import { distanceKm, validPosition } from '@/lib/dentistGeo';
const KEY='teewai_dentist_last_area_v2';
function savedArea() {
  try {const value=JSON.parse(localStorage.getItem(KEY));return validPosition(value?.position) ? value : null;} catch {return null;}
}
export default function useFinderLocation() {
  const [saved]=useState(savedArea);
  const [origin,setOrigin]=useState(saved?.position || null);
  const [userPos,setUserPos]=useState(saved?.kind==='device' ? saved.position : null);
  const [areaLabel,setAreaLabel]=useState(saved ? `Last saved area${saved.label ? ` · ${saved.label}` : ''}` : '');
  const [locating,setLocating]=useState(true);
  const [locationError,setLocationError]=useState(null);
  const [areaQuery,setAreaQuery]=useState('');
  const [areaSearching,setAreaSearching]=useState(false);
  const [areaError,setAreaError]=useState('');
  const [user,setUser]=useState(null);
  const cancel=useRef(null), request=useRef(0);
  const save=(position,kind,label='') => {
    try {localStorage.setItem(KEY,JSON.stringify({position,kind,label,time:Date.now()}));} catch {}
  };
  const locate=() => {
    cancel.current?.(); request.current++;
    setLocating(true);setLocationError(null);setAreaSearching(false);setAreaError('');
    cancel.current=requestDeviceLocation(p => {
      const pos=[p.coords.latitude,p.coords.longitude];
      setUserPos(pos);
      setOrigin(old => !old || distanceKm(old,pos)>0.1 ? pos : old);
      setAreaLabel(`Near your device location · ±${Math.round(p.coords.accuracy)} m`);
      setLocating(false);setLocationError(null);save(pos,'device');
    }, error => {setLocationError(error);setLocating(false);});
  };
  const searchArea=async e => {
    e?.preventDefault();const query=areaQuery.trim();if (!query) return;
    cancel.current?.();const current=++request.current;
    setAreaSearching(true);setLocating(false);setAreaError('');
    try {
      const pos=await geocodeCity(query);
      if (current!==request.current) return;
      if (!validPosition(pos)) {setAreaError('That area was not found. Try the city and country.');return;}
      setOrigin(pos);setAreaLabel(`Near ${query} · distances from this area`);setLocationError(null);save(pos,'area',query);
    } catch(error) {if (current===request.current) setAreaError(error.message || 'Area search unavailable. Please retry.');}
    finally {if (current===request.current) setAreaSearching(false);}
  };
  useEffect(() => {
    let active=true;
    unrufld.auth.me().then(me => {if (active) setUser(me);}).catch(() => {if (active) setAreaError('Sign in again to manage your care team. Area browsing remains available.');});
    locate();
    return () => {active=false;cancel.current?.();request.current++;};
  },[]);
  return {origin,userPos,user,areaLabel,locating,locationError,areaQuery,setAreaQuery,areaSearching,areaError,locate,searchArea};
}