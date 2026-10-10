import FinderSkeleton from '@/components/dentist/FinderSkeleton';
import FinderResultRow from '@/components/dentist/FinderResultRow';
export default function FinderResults({ finder:f, selected, onSelect, onManage, route }) {
  const loading=f.busy || f.locating;
  return <div className="space-y-3" data-testid="dentist-results" data-results-rendered-ms={f.firstResultsMs ?? ''}>
    {f.locationError && <div role="status" className="rounded-xl border border-border bg-muted p-3 text-sm"><p className="font-medium">{f.locationError.title}</p><p className="text-muted-foreground text-xs mt-1">{f.locationError.message}{f.origin ? ' Showing results for your last saved area meanwhile.' : ''}</p></div>}
    {f.areaError && <p role="alert" className="text-sm text-danger">{f.areaError}</p>}
    {f.error && <div role="status" className="text-sm text-muted-foreground"><p>{f.error}</p><button onClick={f.refresh} disabled={f.busy} className="text-olo underline py-2 disabled:opacity-50">Retry search</button></div>}
    {f.notice && <p role="status" className="text-xs text-muted-foreground">{f.notice}</p>}
    {f.rows.length>0 && <p className="text-xs text-muted-foreground">{f.rows.length} result{f.rows.length===1 ? '' : 's'}{f.query.trim() ? ' · manual search, all areas' : ` · within ${f.radius} km · nearest first`}</p>}
    {f.rows.map(d => <FinderResultRow key={d.id} dentist={d} selected={selected?.id===d.id} route={route} onSelect={() => onSelect(d)} onManage={() => onManage(d)} />)}
    {loading && !f.rows.length && !f.query.trim() && <FinderSkeleton />}
    {!loading && !f.rows.length && !f.error && <p className="text-sm text-muted-foreground py-3">{f.query.trim() ? 'No matching dentist. Try a clinic name or another area.' : !f.origin ? 'Enter an area above or search a dentist by name to browse without location.' : 'Try another area or search a dentist by name.'}</p>}
    <p className="text-xs text-muted-foreground pt-2">Clinic and map data © OpenStreetMap contributors. Unmapped clinics and unlisted phone numbers cannot be shown.</p>
  </div>;
}