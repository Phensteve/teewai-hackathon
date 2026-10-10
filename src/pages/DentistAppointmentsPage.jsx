import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { dentistClients } from '@/lib/insforgeDb';
import PageSkeleton from '@/components/loading/PageSkeleton';
import DentistAppointments from '@/components/dentist/DentistAppointments';

// Production dentist appointments page. Loads the dentist's clients and
// appointments, then delegates to the DentistAppointments component which
// handles the full scheduling + treatment-recording workflow.
export default function DentistAppointmentsPage() {
  const { user, profile, reload: reloadShell } = useOutletContext();
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [clientList, apptList] = await Promise.all([
        dentistClients.filter({ dentist_id: user.id }),
        unrufld.entities.Appointment.filter({ dentist_id: user.id }, '-requested_date', 100),
      ]);
      setClients(clientList);
      setAppointments(apptList);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="font-heading font-700 text-2xl tracking-tight mb-1">Appointments</h1>
      <p className="text-sm text-muted-foreground mb-6">Schedule visits, confirm requests, and record treatments after each appointment.</p>
      <DentistAppointments
        appointments={appointments}
        clients={clients}
        user={user}
        profile={profile}
        reload={load}
      />
    </div>
  );
}