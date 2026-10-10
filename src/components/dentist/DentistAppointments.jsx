import { useState } from 'react';
import { unrufld } from '@/api/unrufldClient';
const appts = unrufld.entities.Appointment;
import { Check, X, CheckCircle2, RotateCcw, Loader2, Plus, CalendarPlus } from 'lucide-react';
import Spinner from '@/components/Spinner';
import TreatmentRecordForm, { treatmentLabel, TreatmentIcon } from '@/components/dentist/TreatmentRecordForm';

// Appointment management — the scheduling workflow at the heart of every
// dental PMS (Dentrix / Oryx / CareStack). Dentists confirm pending requests,
// mark confirmed visits completed, cancel, or reopen. They can also BOOK a
// patient directly from the clinic side (a core PMS capability), clear the
// pending queue with one action, and browse appointments grouped by date.
const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Attended' },
  { key: 'postponed', label: 'Postponed' },
  { key: 'missed', label: 'Missed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

export default function DentistAppointments({ appointments, clients, user, profile, reload }) {
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ client_email: '', requested_date: '', requested_time: '', reason: '' });
  const [savingNew, setSavingNew] = useState(false);
  const [recordingId, setRecordingId] = useState(null);

  const clientName = (email) => clients.find((c) => c.client_email === email)?.client_name || email || 'Unknown';

  const setStatus = async (id, status) => {
    setBusy(id);
    try { await appts.update(id, { status }); await reload(); }
    catch {}
    finally { setBusy(null); }
  };

  // Mark as completed WITH treatment data — the dentist records what they did
  // (procedure type, teeth, notes) and the appointment is completed in the
  // same update. The treatment data flows to the patient dashboard via RLS
  // (patient_email match).
  const completeWithTreatment = async (id, treatment) => {
    setBusy(id);
    try {
      await appts.update(id, {
        status: 'completed',
        treatment_type: treatment.treatment_type,
        teeth_treated: treatment.teeth_treated,
        treatment_notes: treatment.treatment_notes,
      });
      setRecordingId(null);
      await reload();
    } catch {}
    finally { setBusy(null); }
  };

  const confirmAllPending = async () => {
    const pend = appointments.filter((a) => a.status === 'pending');
    if (!pend.length) return;
    setBusy('all');
    try {
      await Promise.all(pend.map((a) => appts.update(a.id, { status: 'confirmed' })));
      await reload();
    } catch {}
    finally { setBusy(null); }
  };

  const createAppt = async (e) => {
    e.preventDefault();
    setSavingNew(true);
    try {
      await appts.create({
        dentist_id: user.id,
        dentist_name: profile?.clinic_name || null,
        patient_email: form.client_email,
        requested_date: form.requested_date,
        requested_time: form.requested_time,
        reason: form.reason,
        status: 'confirmed',
      });
      setForm({ client_email: '', requested_date: '', requested_time: '', reason: '' });
      setShowNew(false);
      await reload();
    } catch {}
    finally { setSavingNew(false); }
  };

  const list = (filter === 'all' ? appointments : appointments.filter((a) => a.status === filter))
    .sort((a, b) => (a.requested_date || '').localeCompare(b.requested_date || '') || (a.requested_time || '').localeCompare(b.requested_time || ''));

  // Group appointments by date so the schedule reads like a calendar agenda.
  const groups = {};
  list.forEach((a) => {
    const k = a.requested_date || 'No date';
    (groups[k] = groups[k] || []).push(a);
  });

  const statusCls = (s) => s === 'confirmed' ? 'bg-olo/10 text-olo'
    : s === 'pending' ? 'bg-amber-500/10 text-amber-500'
    : s === 'completed' ? 'bg-emerald-500/10 text-emerald-500'
    : s === 'postponed' ? 'bg-orange-500/10 text-orange-500'
    : s === 'missed' ? 'bg-rose-500/10 text-rose-500'
    : 'bg-muted text-muted-foreground';

  const pendingCount = appointments.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-end">
          <button onClick={() => setShowNew(!showNew)} className="inline-flex items-center gap-1.5 bg-olo text-white text-sm font-semibold px-3.5 py-2 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap">
            <Plus className="w-4 h-4" /> New appointment
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((f) => {
            const count = f.key === 'all' ? appointments.length : appointments.filter((a) => a.status === f.key).length;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${filter === f.key ? 'bg-olo text-white' : 'bg-card border border-border text-muted-foreground hover:border-olo/40'}`}>
                {f.label} <span className={`text-xs ${filter === f.key ? 'text-white/70' : 'text-muted-foreground/70'}`}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {filter === 'pending' && pendingCount > 0 && (
        <button onClick={confirmAllPending} disabled={busy === 'all'}
          className="w-full inline-flex items-center justify-center gap-2 border border-olo/30 text-olo text-sm font-semibold py-2.5 rounded-xl hover:bg-olo/5 disabled:opacity-50 transition-colors">
          {busy === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm all {pendingCount} pending
        </button>
      )}

      {showNew && (
        <form onSubmit={createAppt} className="p-4 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2"><CalendarPlus className="w-4 h-4 text-olo" /><h3 className="font-heading font-600 text-sm">Book a patient</h3></div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Patient</label>
            <select required value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })}
              className="w-full h-11 px-3 mt-1 rounded-xl border border-border bg-background focus:border-olo focus:outline-none text-sm">
              <option value="">Select a patient…</option>
              {clients.map((c) => <option key={c.id} value={c.client_email}>{c.client_name} — {c.client_email}</option>)}
            </select>
            {clients.length === 0 && <p className="text-xs text-muted-foreground mt-1">Add patients first in the Patients tab.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</label>
              <input type="date" required value={form.requested_date} onChange={(e) => setForm({ ...form, requested_date: e.target.value })}
                className="w-full h-11 px-3 mt-1 rounded-xl border border-border bg-background focus:border-olo focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</label>
              <input type="time" value={form.requested_time} onChange={(e) => setForm({ ...form, requested_time: e.target.value })}
                className="w-full h-11 px-3 mt-1 rounded-xl border border-border bg-background focus:border-olo focus:outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Reason</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Whitening consult, checkup…"
              className="w-full h-11 px-3 mt-1 rounded-xl border border-border bg-background focus:border-olo focus:outline-none text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={savingNew || !clients.length}
              className="flex-1 bg-olo text-white font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {savingNew ? <Spinner size={16} /> : <Check className="w-4 h-4" />} Book appointment
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="border border-border text-muted-foreground px-4 rounded-xl hover:text-foreground">Cancel</button>
          </div>
        </form>
      )}

      {list.length === 0 ? (
        <div className="text-center py-12 p-8 rounded-2xl border border-border bg-card">
          <p className="text-muted-foreground text-sm">No {filter !== 'all' ? filter : ''} appointments.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                {date === 'No date' ? 'No date' : new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
              <div className="space-y-2.5">
                {items.map((a) => (
                  <div key={a.id} className="p-4 rounded-2xl border border-border bg-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{clientName(a.patient_email)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {a.requested_date || 'No date'}{a.requested_time ? ` · ${a.requested_time}` : ''}{a.reason ? ` · ${a.reason}` : ''}
                        </p>
                        {a.patient_cancel_reason && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            <span className="font-medium">Patient note:</span> {a.patient_cancel_reason}
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusCls(a.status)}`}>{a.status}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {a.status === 'pending' && (
                        <button onClick={() => setStatus(a.id, 'confirmed')} disabled={busy === a.id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-olo text-white text-sm font-semibold py-2 rounded-xl hover:opacity-90 disabled:opacity-50">
                          {busy === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm
                        </button>
                      )}
                      {a.status === 'confirmed' && (
                        <>
                          <button onClick={() => setRecordingId(recordingId === a.id ? null : a.id)} disabled={busy === a.id}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-500 text-white text-sm font-semibold py-2 rounded-xl hover:opacity-90 disabled:opacity-50">
                            {busy === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Attended
                          </button>
                          <button onClick={() => setStatus(a.id, 'postponed')} disabled={busy === a.id}
                            className="inline-flex items-center justify-center gap-1.5 border border-orange-500/30 text-orange-500 text-sm font-medium py-2 px-3 rounded-xl hover:bg-orange-500/5 disabled:opacity-50">
                            {busy === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Postponed
                          </button>
                          <button onClick={() => setStatus(a.id, 'missed')} disabled={busy === a.id}
                            className="inline-flex items-center justify-center gap-1.5 border border-rose-500/30 text-rose-500 text-sm font-medium py-2 px-3 rounded-xl hover:bg-rose-500/5 disabled:opacity-50">
                            {busy === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Missed
                          </button>
                        </>
                      )}
                      {(a.status === 'pending' || a.status === 'confirmed') && (
                        <button onClick={() => setStatus(a.id, 'cancelled')} disabled={busy === a.id}
                          className="inline-flex items-center justify-center gap-1.5 border border-border text-muted-foreground text-sm font-medium py-2 px-3 rounded-xl hover:text-rose-500 hover:border-rose-500/30 disabled:opacity-50">
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      )}
                      {(a.status === 'cancelled' || a.status === 'postponed' || a.status === 'missed') && (
                        <button onClick={() => setStatus(a.id, 'pending')} disabled={busy === a.id}
                          className="inline-flex items-center justify-center gap-1.5 border border-border text-muted-foreground text-sm font-medium py-2 px-3 rounded-xl hover:text-olo hover:border-olo/30 disabled:opacity-50">
                          {busy === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Reopen
                        </button>
                      )}
                    </div>

                    {/* Treatment recording form — shown when the dentist clicks "Attended" */}
                    {recordingId === a.id && a.status === 'confirmed' && (
                      <div className="mt-3">
                        <TreatmentRecordForm
                          appointment={a}
                          saving={busy === a.id}
                          onSave={(treatment) => completeWithTreatment(a.id, treatment)}
                          onCancel={() => setRecordingId(null)}
                        />
                      </div>
                    )}

                    {/* Treatment summary — shown on completed appointments */}
                    {a.status === 'completed' && (a.treatment_type || a.treatment_notes || a.teeth_treated) && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <TreatmentIcon type={a.treatment_type} className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium">{treatmentLabel(a.treatment_type)}</span>
                        </div>
                        {a.teeth_treated && (
                          <p className="text-xs text-muted-foreground"><span className="font-medium">Teeth:</span> {a.teeth_treated}</p>
                        )}
                        {a.treatment_notes && (
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{a.treatment_notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}