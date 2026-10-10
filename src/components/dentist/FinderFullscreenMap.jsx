import { Minimize } from 'lucide-react';
import DentistMap from '@/components/DentistMap';
import FinderRouteSummary from '@/components/dentist/FinderRouteSummary';
import { useScrollLock } from '@/hooks/use-scroll-lock';
export default function FinderFullscreenMap({ open, finder:f, selected, onSelect, onClose, route }) {
  useScrollLock(open);
  if (!open) return null;
  const pins=selected && !f.rows.some(d => d.id===selected.id) ? [...f.rows,selected] : f.rows;
  return <div role="dialog" aria-label="Dentist route map" aria-modal="true" className="fixed inset-0 z-[1500] bg-background p-2 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
    <div className="h-full w-full rounded-2xl overflow-hidden border border-border relative isolate">
      <DentistMap center={f.origin || [20,0]} dentists={pins} selected={selected} onSelect={onSelect} userPos={f.userPos || f.origin} originLabel={f.userPos ? 'Your location' : 'Searched area'} radiusKm={f.origin ? f.radius : null} route={route} />
      <button type="button" onClick={onClose} aria-label="Close fullscreen map" className="absolute right-3 top-3 z-[500] p-3 rounded-xl bg-card border border-border text-foreground"><Minimize className="w-5 h-5" /></button>
      {route && <div className="absolute bottom-3 inset-x-3 z-[500] p-3 rounded-xl bg-card border border-border"><FinderRouteSummary route={route} /></div>}
    </div>
  </div>;
}