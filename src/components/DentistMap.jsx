import { MapContainer, TileLayer, Marker, CircleMarker, Circle, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DentistMapController from '@/components/dentist/DentistMapController';
import { hasCoordinates } from '@/lib/dentistGeo';
const pin=d => L.divIcon({className:'dp-wrap',html:`<div class="dp-dot ${d.isTeewai ? 'dp-teewai' : 'dp-nearby'}"></div>`,iconSize:[16,16],iconAnchor:[8,8]});
export default function DentistMap({ center, dentists=[], selected, onSelect, userPos, originLabel='Your location', radiusKm, route }) {
  return <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="w-full h-full bg-muted">
    <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} />
    <DentistMapController center={center} userPos={userPos} dentist={selected} route={route} radiusKm={radiusKm} />
    {radiusKm && <Circle center={center} radius={radiusKm*1000} interactive={false} pathOptions={{color:'hsl(var(--olo))',weight:1,fillOpacity:0.04}} />}
    {route && <Polyline positions={route.path} pathOptions={{className:'dentist-route-line',color:'var(--dentist-route)',weight:4,lineCap:'round'}} />}
    {userPos && <CircleMarker center={userPos} radius={8} pathOptions={{color:'var(--dentist-route)',fillColor:'var(--dentist-route)',fillOpacity:0.8,weight:3}}><Tooltip>{originLabel}</Tooltip></CircleMarker>}
    {dentists.filter(hasCoordinates).map(d => <Marker key={d.id} position={[d.latitude,d.longitude]} icon={pin(d)} zIndexOffset={selected?.id===d.id ? 1000 : 0} eventHandlers={{click:() => onSelect(d)}}>
      <Tooltip permanent={selected?.id===d.id} direction="top">{d.clinic_name || d.practice_name || d.full_name}</Tooltip>
    </Marker>)}
  </MapContainer>;
}