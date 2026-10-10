import { ChevronUp, RotateCcw } from 'lucide-react';
export default function FinderHeader({ finder:f, expanded, onToggle }) {
  return <header className="shrink-0 px-4 pt-2 pb-3 border-b border-border">
    <button type="button" onClick={onToggle} aria-label={expanded ? 'Show map card' : 'Expand dentist list'} className="flex justify-center w-full py-2"><span className="w-10 h-1 rounded-full bg-border" /></button>
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <h1 className="font-heading text-xl font-semibold">Find a dentist</h1>
        <p aria-live="polite" className="text-xs text-muted-foreground mt-1">{f.locating ? 'Finding dentists near you…' : f.areaLabel || 'Nearby dentists and manual search'}</p>
      </div>
      <button type="button" onClick={f.refresh} aria-label="Refresh nearby dentists" disabled={f.busy} className="p-2 text-olo rounded-lg disabled:opacity-50"><RotateCcw className={`w-4 h-4 ${f.busy ? 'motion-safe:animate-spin' : ''}`} /></button>
      <button type="button" onClick={onToggle} aria-label={expanded ? 'Show map' : 'Expand list'} className="p-2 text-olo rounded-lg"><ChevronUp className={`w-4 h-4 ${expanded ? 'rotate-180' : ''}`} /></button>
    </div>
  </header>;
}