import { Switch } from '@/components/ui/switch';
import { BadgeCheck, Stethoscope, Share2, Trash2, ShieldAlert, Loader2 } from 'lucide-react';

export default function AssignmentCard({ assignment, dentist, onRevoke, onTogglePhotos, onShareScans, revoking }) {
  if (!dentist) return null;
  const name = dentist.full_name || dentist.clinic_name || 'Dentist';
  const isPrimary = assignment.assignment_type === 'primary';

  return (
    <div className="p-4 rounded-2xl border border-border bg-card">
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
            <h3 className="font-heading font-600 text-sm truncate">{name}</h3>
            {dentist.verified && <BadgeCheck className="w-4 h-4 text-olo flex-shrink-0" />}
          </div>
          {dentist.specialization && <p className="text-xs text-muted-foreground">{dentist.specialization}</p>}
          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isPrimary ? 'bg-olo/15 text-olo' : 'bg-muted text-muted-foreground'}`}>
            {isPrimary ? 'Primary dentist' : 'Secondary dentist'}
          </span>
        </div>
      </div>

      {isPrimary && (
        <div className="mt-3 p-3 rounded-xl bg-olo/5 border border-olo/15">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">Photo access</p>
              <p className="text-xs text-muted-foreground">Allow {name} to see your scan photos</p>
            </div>
            <Switch
              checked={assignment.can_see_photos}
              onCheckedChange={onTogglePhotos}
            />
          </div>
          {!assignment.can_see_photos && (
            <p className="text-[11px] text-muted-foreground mt-1.5">Off — they can see reports only, not photos.</p>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {!isPrimary && (
          <button
            onClick={onShareScans}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-olo border border-olo/30 bg-olo/5 px-3 py-2 rounded-xl hover:bg-olo/10 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share scans
          </button>
        )}
        <button
          onClick={onRevoke}
          disabled={revoking}
          className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2 rounded-xl hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Revoke
        </button>
      </div>
    </div>
  );
}