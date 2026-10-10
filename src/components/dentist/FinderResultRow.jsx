import { BadgeCheck, Calendar, MapPin, Phone, Navigation } from 'lucide-react';
import FinderRouteSummary from '@/components/dentist/FinderRouteSummary';
export default function FinderResultRow({ dentist:d, selected, onSelect, onManage, route }) {
  return <article data-dentist-id={d.id} data-distance-km={d.distance ?? ''} className={`rounded-2xl border p-4 bg-card space-y-2 ${selected ? 'border-olo ring-1 ring-olo/20' : 'border-border'}`}>
    <button type="button" onClick={onSelect} className="w-full text-left min-w-0 space-y-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-heading font-semibold text-base break-words">{d.full_name || d.clinic_name || 'Dental clinic'}</span>
        {d.isTeewai && d.verified && <span className="inline-flex items-center gap-1 text-xs text-olo bg-olo/10 px-2 py-1 rounded-full"><BadgeCheck className="w-3.5 h-3.5" /> Verified teewai</span>}
      </span>
      {d.dental_tier>1 && <span className="block text-xs text-muted-foreground">{d.dental_tier===2 ? 'Dental services confirmed on their website' : 'Likely offers dental care · call to confirm'}</span>}
      <span className="block text-sm text-muted-foreground break-words">{d.practice_name || d.clinic_name || 'Practice name not listed'}</span>
      {d.address && <span className="block text-xs text-muted-foreground break-words">{d.address}</span>}
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{d.distance != null ? `~${d.distance.toFixed(1)} km` : 'Distance unavailable'}</span>
    </button>
    {d.phone ? <a href={`tel:${d.phone.replace(/[^\d+]/g,'')}`} className="inline-flex items-center gap-1.5 text-sm text-olo break-all"><Phone className="w-3.5 h-3.5 shrink-0" />{d.phone}</a> : <p className="text-xs text-muted-foreground">Phone not listed</p>}
    {selected && <FinderRouteSummary route={route} />}
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onSelect} className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl border border-olo/30 py-2.5 text-sm text-olo"><Navigation className="w-4 h-4" /> Map</button>
      <button type="button" onClick={onManage} className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium"><Calendar className="w-4 h-4" />{d.isTeewai ? 'Manage / add' : 'View clinic'}</button>
    </div>
  </article>;
}