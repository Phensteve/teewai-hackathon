import { Expand } from 'lucide-react';
import DentistMap from '@/components/DentistMap';
import FinderRouteSummary from '@/components/dentist/FinderRouteSummary';
export default function FinderMapCard({ finder:f, selected, onSelect, onExpand, expanded, route, embedded }) {
  const origin=f.userPos || f.origin;
  const pins=selected && !f.rows.some(d => d.id===selected.id) ? [...f.rows,selected] : f.rows;
  return <div className={`shrink-0 p-2 ${expanded ? 'h-[16vh]' : 'h-[30vh]'} ${embedded ? 'pt-[calc(0.5rem+env(safe-area-inset-top))]' : ''}`}>
    <div id="dentist-map" className="w-full h-full rounded-2xl overflow-hidden relative isolate border border-border bg-muted">
      <DentistMap center={f.origin || [20,0]} dentists={pins} selected={selected} onSelect={onSelect} userPos={origin} originLabel={f.userPos ? f.areaLabel.startsWith('Last') ? 'Last-known location' : 'Your location' : 'Searched area'} radiusKm={f.origin ? f.radius : null} route={route} />
      <button type="button" onClick={onExpand} aria-label="Expand map" className={`absolute top-3 ${embedded ? 'left-3' : 'right-3'} z-[500] rounded-xl p-2.5 bg-card text-foreground border border-border shadow-sm`}><Expand className="w-4 h-4" /></button>
      {selected && route && <div className="absolute bottom-2 inset-x-2 z-[500] bg-card/95 border border-border rounded-xl p-2"><FinderRouteSummary route={route} /></div>}
    </div>
  </div>;
}