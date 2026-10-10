import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { Inbox, Clock, X, Loader2 } from 'lucide-react';

// Dentist-side pending requests: assignments this dentist initiated that are
// still awaiting patient approval. The dentist sees nothing of the patient's
// data until the patient approves.
export default function DentistPending() {
  const { user } = useOutletContext();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await unrufld.entities.DentistAssignment.filter({
        dentist_user_id: user.id,
        status: 'pending',
        initiated_by: 'dentist',
      });
      setPending(list);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    setCanceling(id);
    setError('');
    try {
      await unrufld.entities.DentistAssignment.update(id, { status: 'revoked' });
      load();
    } catch (e) {
      setError(e?.message || 'Could not cancel the request. Please try again.');
    } finally { setCanceling(null); }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Inbox className="w-5 h-5 text-olo" />
        <h1 className="font-heading font-700 text-2xl tracking-tight">Pending Requests</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Requests you've sent that are waiting for patient approval.</p>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {pending.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center">
          <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No pending requests.</p>
          <p className="text-xs text-muted-foreground mt-1">Add a patient from My Patients to send a request.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((a) => (
            <div key={a.id} className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{a.patient_name || a.patient_email}</p>
                <p className="text-xs text-muted-foreground truncate">{a.patient_email}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Proposed: {a.proposed_role || a.assignment_type}</p>
              </div>
              <button
                onClick={() => cancel(a.id)}
                disabled={canceling === a.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                {canceling === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><X className="w-3.5 h-3.5" /> Cancel</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}