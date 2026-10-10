import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Stethoscope, UserPlus, Check } from 'lucide-react';

export default function DentistCard({ dentist, onClick, onAdd, added }) {
  const name = dentist.full_name || dentist.clinic_name || 'Dentist';
  const practice = dentist.practice_name || dentist.clinic_name;
  const spec = dentist.specialization;
  const cls = 'block p-4 rounded-2xl border border-border bg-card hover:border-olo/40 hover:shadow-sm transition-all group';

  const content = (
    <div>
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {dentist.profile_picture ? (
          <img src={dentist.profile_picture} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Stethoscope className="w-6 h-6 text-olo" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="font-heading font-600 text-sm truncate group-hover:text-olo transition-colors">{name}</h3>
          {dentist.subscription_active && (
            <span className="inline-flex items-center gap-0.5 bg-olo/15 text-olo text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0">
              <BadgeCheck className="w-2.5 h-2.5" /> Teewai
            </span>
          )}
          {dentist.verified && <BadgeCheck className="w-4 h-4 text-olo flex-shrink-0" />}
        </div>
        {practice && <p className="text-xs text-muted-foreground truncate">{practice}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {spec && <span className="text-[11px] font-medium text-olo bg-olo/10 px-2 py-0.5 rounded-full">{spec}</span>}
          {dentist.city && (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
              <MapPin className="w-3 h-3" /> {dentist.city}
            </span>
          )}
        </div>
      </div>
    </div>
    {onAdd && (
      <div className="mt-3 flex justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          disabled={added}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${added ? 'bg-olo/10 text-olo cursor-default' : 'bg-olo text-white hover:scale-105'}`}
        >
          {added ? <><Check className="w-3 h-3" /> Added</> : <><UserPlus className="w-3 h-3" /> Add</>}
        </button>
      </div>
    )}
    </div>
  );

  if (onClick) {
    return <div onClick={onClick} className={`${cls} cursor-pointer`}>{content}</div>;
  }
  return <Link to={`/dentists/${dentist.id}`} className={cls}>{content}</Link>;
}