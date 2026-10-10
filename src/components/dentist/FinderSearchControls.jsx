import { Search, LocateFixed } from 'lucide-react';
import { RADII } from '@/lib/dentistGeo';
export default function FinderSearchControls({ finder:f }) {
  return <div className="space-y-3">
    <form onSubmit={f.searchArea} className="flex gap-2">
      <input aria-label="City or area" value={f.areaQuery} onChange={e => f.setAreaQuery(e.target.value)} placeholder="Enter an area or city" className="min-w-0 flex-1 h-11 px-3 bg-background border border-border rounded-xl text-sm" />
      <button disabled={f.areaSearching || !f.areaQuery.trim()} className="px-3 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-50">{f.areaSearching ? 'Finding…' : 'Go'}</button>
      <button type="button" onClick={f.locate} aria-label="Use my location" className="w-11 rounded-xl border border-border text-olo flex justify-center items-center"><LocateFixed className="w-4 h-4" /></button>
    </form>
    <label className="relative block">
      <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
      <input aria-label="Search dentists by name or area" value={f.query} onChange={e => f.setQuery(e.target.value)} placeholder="Search dentist, clinic or area" className="w-full h-11 pl-9 pr-3 bg-background border border-border rounded-xl text-sm" />
    </label>
    <div className="flex gap-2 flex-wrap" aria-label="Search radius">
      {RADII.map(r => <button key={r} type="button" aria-pressed={f.radius === r} onClick={() => f.setRequestedRadius(r)} className={`px-3 py-2 rounded-full border text-xs ${f.radius === r ? 'bg-olo/10 border-olo text-olo' : 'border-border text-muted-foreground'}`}>{r} km</button>)}
    </div>
  </div>;
}