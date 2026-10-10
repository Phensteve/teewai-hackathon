import { useState } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { Stethoscope, ShieldCheck, Loader2, Check, X, AlertCircle } from 'lucide-react';

// Patient-side card for a dentist-initiated pending assignment. The patient
// approves or declines. On approval the PATIENT picks the role (primary or
// secondary) — the dentist's proposal is only a suggestion. One-primary rule:
// choosing primary retires any existing primary assignment (with notice).
export default function PendingRequestCard({ assignment, dentist, onResolved }) {
  const [step, setStep] = useState('review'); // review -> choose -> done
  const [role, setRole] = useState(assignment.proposed_role || 'secondary');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retiredPrimary, setRetiredPrimary] = useState(null);

  const name = dentist?.full_name || dentist?.clinic_name || assignment.dentist_name || 'A dentist';
  const practice = dentist?.practice_name || dentist?.clinic_name;

  const approve = async () => {
    setBusy(true);
    setError('');
    try {
      // One-primary rule: if the patient picks primary, retire the existing primary.
      if (role === 'primary') {
        const existing = await unrufld.entities.DentistAssignment.filter({
          created_by_id: assignment.patient_id,
          assignment_type: 'primary',
          status: 'active',
        });
        const current = existing.find((a) => a.id !== assignment.id);
        if (current) {
          await unrufld.entities.DentistAssignment.update(current.id, { status: 'revoked' });
          if (current.dentist_user_id) {
            try {
              await unrufld.entities.Scan.updateMany(
                { created_by_id: assignment.patient_id, dentist_id: current.dentist_user_id },
                { $unset: { dentist_id: '' } }
              );
            } catch {}
          }
          setRetiredPrimary(current.dentist_name || 'your previous primary dentist');
        }
      }

      await unrufld.entities.DentistAssignment.update(assignment.id, {
        assignment_type: role,
        status: 'active',
        consent_given: true,
        consent_date: new Date().toISOString(),
      });

      // Link scans to the new primary dentist.
      if (role === 'primary' && assignment.dentist_user_id) {
        try {
          await unrufld.entities.Scan.updateMany(
            { created_by_id: assignment.patient_id },
            { $set: { dentist_id: assignment.dentist_user_id } }
          );
        } catch {}
      }

      setStep('done');
      onResolved?.();
    } catch (e) {
      setError(e?.message || 'Could not approve. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    setError('');
    try {
      await unrufld.entities.DentistAssignment.update(assignment.id, { status: 'revoked' });
      setStep('done');
      onResolved?.();
    } catch (e) {
      setError(e?.message || 'Could not decline. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="p-4 rounded-2xl border border-olo/20 bg-olo/5 flex items-center gap-3">
        <Check className="w-5 h-5 text-olo flex-shrink-0" />
        <p className="text-sm font-medium">Request resolved. {retiredPrimary && role === 'primary' && <span className="text-muted-foreground">{retiredPrimary} is no longer your primary dentist.</span>}</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-olo" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{name} wants to join your care team</p>
          {practice && <p className="text-xs text-muted-foreground truncate">{practice}</p>}
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Proposed role: <span className="font-medium">{assignment.proposed_role || 'secondary'}</span>
          </p>
        </div>
      </div>

      {step === 'review' && (
        <div className="flex gap-2">
          <button
            onClick={() => setStep('choose')}
            className="flex-1 h-9 rounded-full bg-olo text-white text-xs font-semibold px-3 hover:opacity-90 transition-opacity"
          >
            Review request
          </button>
          <button
            onClick={decline}
            disabled={busy}
            className="flex-1 h-9 rounded-full border border-border text-foreground text-xs font-semibold px-3 hover:bg-muted/60 transition-colors inline-flex items-center justify-center gap-1"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><X className="w-3.5 h-3.5" /> Decline</>}
          </button>
        </div>
      )}

      {step === 'choose' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Choose the role for {name}. Your choice is final.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRole('primary')}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium border text-left transition-all ${role === 'primary' ? 'border-olo bg-olo/10 text-olo' : 'border-border text-muted-foreground'}`}
            >
              <Stethoscope className="w-4 h-4 mb-1" /> Primary
              <span className="block text-[11px] font-normal opacity-80">Full scan reports</span>
            </button>
            <button
              onClick={() => setRole('secondary')}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium border text-left transition-all ${role === 'secondary' ? 'border-olo bg-olo/10 text-olo' : 'border-border text-muted-foreground'}`}
            >
              <ShieldCheck className="w-4 h-4 mb-1" /> Secondary
              <span className="block text-[11px] font-normal opacity-80">Shared scans only</span>
            </button>
          </div>
          {role === 'primary' && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Choosing primary replaces your current primary dentist if you have one.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setStep('review')}
              disabled={busy}
              className="flex-1 h-9 rounded-full border border-border text-foreground text-xs font-semibold px-3 hover:bg-muted/60 transition-colors"
            >
              Back
            </button>
            <button
              onClick={approve}
              disabled={busy}
              className="flex-1 h-9 rounded-full bg-olo text-white text-xs font-semibold px-3 hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-1"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Confirm as {role}</>}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}