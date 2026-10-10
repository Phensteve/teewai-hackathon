import { useState, useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { Activity, Loader2, ChevronDown } from 'lucide-react';
import { treatmentLabel, TreatmentIcon } from '@/components/dentist/TreatmentRecordForm';

// Patient-facing treatment history — loads completed appointments for the
// current user (matched by patient_email) and shows them as an expandable
// timeline. Each entry shows the treatment type, teeth treated, notes, the
// dentist who performed it, and the date. This is the patient's dental
// treatment record, populated by their dentist when marking appointments
// as completed.
export default function TreatmentHistory() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await unrufld.auth.me();
        if (!me?.email) { setLoading(false); return; }
        const appts = await unrufld.entities.Appointment.filter(
          { patient_email: me.email, status: 'completed' },
          '-requested_date',
          50,
        );
        if (active) setAppointments(appts);
      } catch { /* non-fatal */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-olo animate-spin" />
      </div>
    );
  }

  if (appointments.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-olo" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dental treatments</h3>
      </div>
      <div className="space-y-2">
        {appointments.map((a) => {
          const isOpen = expanded === a.id;
          const hasTreatment = a.treatment_type || a.treatment_notes;
          return (
            <div key={a.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : a.id)}
                className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-olo/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
                  <TreatmentIcon type={a.treatment_type} className="w-4 h-4 text-olo" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {hasTreatment ? treatmentLabel(a.treatment_type) : 'Appointment completed'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.dentist_name || 'Your dentist'} · {a.requested_date ? new Date(a.requested_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-3.5 pb-3.5 space-y-2">
                  {a.teeth_treated && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Teeth treated</p>
                      <p className="text-sm">{a.teeth_treated}</p>
                    </div>
                  )}
                  {a.treatment_notes && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Notes</p>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{a.treatment_notes}</p>
                    </div>
                  )}
                  {!hasTreatment && (
                    <p className="text-xs text-muted-foreground italic">No treatment details were recorded for this visit.</p>
                  )}
                  {a.reason && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reason for visit</p>
                      <p className="text-sm text-muted-foreground">{a.reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}