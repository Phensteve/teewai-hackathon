import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { hasCoordinates } from '@/lib/dentistGeo';
export default function DentistMapController({ center, userPos, dentist, route, radiusKm }) {
  const map=useMap();
  useEffect(() => {
    let frame;
    const fit=() => {
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(() => {
        map.invalidateSize({pan:false});
        if (!map.getSize().x || !map.getSize().y) return;
        if (hasCoordinates(dentist)) {
          const path=[...(route?.path || []),[dentist.latitude,dentist.longitude],userPos || center];
          map.fitBounds(L.latLngBounds(path),{padding:[38,38],maxZoom:16,animate:false});
        } else if (radiusKm) map.fitBounds(L.circle(center,{radius:radiusKm*1000}).getBounds(),{padding:[18,18],maxZoom:14,animate:false});
        else map.setView(center,2,{animate:false});
      });
    };
    const observer=new ResizeObserver(fit);
    observer.observe(map.getContainer());fit();
    return () => {cancelAnimationFrame(frame);observer.disconnect();};
  },[map,center[0],center[1],userPos?.[0],userPos?.[1],dentist?.id,route?.kind,radiusKm]);
  return null;
}