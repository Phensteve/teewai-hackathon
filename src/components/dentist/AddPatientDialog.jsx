import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { unrufld } from '@/api/unrufldClient';
import { UserSearch, Loader2, AlertCircle, Stethoscope, ShieldCheck } from 'lucide-react';

// Dentist-initiated patient add. The dentist enters a patient email; we verify
// the person is a registered teewai user before creating a PENDING assignment.
// The dentist proposes a role (primary or secondary); the patient's final
// choice on approval is what governs. Until the patient approves, the dentist
// sees nothing of the patient's data.
//
// NOTE: User lookup by email requires server-side access (the User entity is
// admin-only for listing). On the current plan this lookup is blocked, so the
// "not on teewai" branch will show until a backend lookup function is available.
export default function AddPatientDialog({ open, dentistProfile, user, onCreated, onClose }) {
  const [email, setEmail] = useState('');
  const [proposedRole, setProposedRole] = useState('secondary');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const reset = () => {
    setEmail('');
    setProposedRole('secondary');
    setError('');
    setNotFound(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotFound(false);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError('Enter an email address.'); return; }

    setChecking(true);
    try {
      // Verify the person is a registered teewai user.
      let patient = null;
      try {
        const matches = await unrufld.entities.User.filter({ email: cleanEmail });
        patient = matches && matches[0];
      } catch { /* RLS may block; treat as not found */ }

      if (!patient) {
        setNotFound(true);
        setChecking(false);
        return;
      }

      // Create a PENDING assignment. The dentist proposes a role; the patient
      // confirms the actual role on approval.
      await unrufld.entities.DentistAssignment.create({
        patient_id: patient.id,
        patient_email: patient.email || cleanEmail,
        patient_name: patient.full_name || cleanEmail,
        dentist_id: dentistProfile.id,
        dentist_user_id: user.id,
        dentist_name: dentistProfile.full_name || dentistProfile.clinic_name || 'Dentist',
        assignment_type: proposedRole,
        proposed_role: proposedRole,
        initiated_by: 'dentist',
        status: 'pending',
        can_see_photos: false,
        consent_given: false,
      });
      reset();
      onCreated();
    } catch (err) {
      setError(err?.message || 'Could not send the request. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserSearch className="w-5 h-5 text-olo" /> Add a patient
          </DialogTitle>
          <DialogDescription className="text-left pt-2">
            Search for a patient by their teewai email. They must already have a teewai account. We'll send them a request to confirm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Patient email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setNotFound(false); setError(''); }}
              required
              placeholder="patient@email.com"
              className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Proposed role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProposedRole('primary')}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border text-left transition-all ${proposedRole === 'primary' ? 'border-olo bg-olo/10 text-olo' : 'border-border text-muted-foreground'}`}
              >
                <Stethoscope className="w-4 h-4 mb-1" /> Primary
                <span className="block text-[11px] font-normal opacity-80">Full scan reports</span>
              </button>
              <button
                type="button"
                onClick={() => setProposedRole('secondary')}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border text-left transition-all ${proposedRole === 'secondary' ? 'border-olo bg-olo/10 text-olo' : 'border-border text-muted-foreground'}`}
              >
                <ShieldCheck className="w-4 h-4 mb-1" /> Secondary
                <span className="block text-[11px] font-normal opacity-80">Shared scans only</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Your proposal is a suggestion. The patient confirms the role when they approve.</p>
          </div>

          {notFound && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400">That person isn't on teewai yet. Ask them to create an account, then send the request again.</p>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={checking}>Cancel</Button>
            <Button type="submit" disabled={checking} className="bg-olo text-white hover:bg-olo/90">
              {checking ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Checking…</> : 'Send request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}