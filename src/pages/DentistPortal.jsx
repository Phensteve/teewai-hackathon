import { useState, useEffect, useCallback } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { dentistProfiles, dentistClients, appointments as appts, scans as insforgeScans } from '@/lib/insforgeDb';
import Spinner from '@/components/Spinner';
import DentistOverview from '@/components/dentist/DentistOverview';
import DentistAppointments from '@/components/dentist/DentistAppointments';
import DentistPatients from '@/components/dentist/DentistPatients';
import DentistPortalSidebar from '@/components/dentist/DentistPortalSidebar';
import { Stethoscope, FlaskConical } from 'lucide-react';

// Dentist portal — B2B clinical workspace (test build). Lives at /dentist-test
// so the public /dentist route stays "Coming soon" until this is ready to ship.
// Sidebar layout (desktop sidebar + mobile drawer) replaces the old tab bar.
// Three views: Overview (KPIs + schedule), Appointments (confirm/cancel),
// Patients (roster + scan timeline + EHR export).

export default function DentistPortal() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await unrufld.auth.me();
      setUser(me);
      const [profiles, clientList, apptList] = await Promise.all([
        dentistProfiles.filter({}),
        dentistClients.filter({ dentist_id: me.id }),
        appts.filter({ dentist_id: me.id }, 'requested_date', 100),
      ]);
      setProfile(profiles.find((p) => p.user_id === me.id) || null);
      setClients(clientList);
      setAppointments(apptList);
      // Fetch scans only for this dentist's own patients (server-scoped to
      // those emails) instead of reading every scan in the table.
      const clientEmails = clientList.map((c) => c.client_email).filter(Boolean);
      const scanList = clientEmails.length
        ? await insforgeScans.filter({ patient_email: { in: clientEmails } }, '-created_date', 200)
        : [];
      setScans(scanList);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    await unrufld.auth.logout(new URL('/login', window.location.origin).href);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <DentistPortalSidebar tab={tab} onTabChange={setTab} onLogout={handleLogout} />

      <main className="flex-1 min-w-0 lg:ml-64 p-4 pt-safe-app lg:p-10 pb-24 lg:pb-10">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-olo" />
              </div>
              <div>
                <h1 className="font-heading font-700 text-2xl tracking-tight">Dentist portal</h1>
                <p className="text-sm text-muted-foreground">Loading your practice…</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-olo/10 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-6 h-6 text-olo" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-heading font-700 text-2xl tracking-tight truncate">{profile?.clinic_name || 'Your practice'}</h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
                      <FlaskConical className="w-3 h-3" /> Test
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{profile?.specialization || 'Dental professional'}{profile?.city ? ` · ${profile.city}` : ''}</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="mt-10 flex justify-center"><Spinner /></div>
          ) : (
            <>
              {tab === 'overview' && <DentistOverview clients={clients} appointments={appointments} scans={scans} onGoTab={setTab} />}
              {tab === 'appointments' && <DentistAppointments appointments={appointments} clients={clients} user={user} profile={profile} reload={load} />}
              {tab === 'patients' && <DentistPatients clients={clients} scans={scans} user={user} reload={load} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}