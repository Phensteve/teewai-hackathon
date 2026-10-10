import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import Spinner from '@/components/Spinner';
import DentistAddressFields from '@/components/dentist/DentistAddressFields';
import AddPatientDialog from '@/components/dentist/AddPatientDialog';
import { Stethoscope, BadgeCheck, Users, ChevronRight, Eye, EyeOff, ArrowLeft, ShieldCheck, UserPlus, AlertCircle, Inbox } from 'lucide-react';

// Dentist "My Patients" page. Uses the DentistShell context for user/profile.
// Adds patients via a dentist-initiated pending request (AddPatientDialog)
// with slot enforcement from the active DentistSubscription.
export default function DentistWorkspace() {
  const { user, profile, reload: reloadShell } = useOutletContext();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [scans, setScans] = useState([]);
  const [shares, setShares] = useState([]);
  const [pending, setPending] = useState([]);
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [regForm, setRegForm] = useState({ full_name: '', practice_name: '', specialization: '', license_number: '', contact_email: '', phone: '', bio: '' });
  const [registering, setRegistering] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [slotError, setSlotError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [myAssignments, myShares, myPending, subs] = await Promise.all([
        unrufld.entities.DentistAssignment.filter({ dentist_user_id: user.id, status: 'active' }),
        unrufld.entities.ScanShare.filter({ dentist_user_id: user.id, status: 'active' }),
        unrufld.entities.DentistAssignment.filter({ dentist_user_id: user.id, status: 'pending', initiated_by: 'dentist' }),
        unrufld.entities.DentistSubscription.filter({ dentist_user_id: user.id }),
      ]);
      setAssignments(myAssignments);
      setShares(myShares);
      setPending(myPending);
      const latest = subs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      const active = latest?.status === 'active' && (!latest.period_end || new Date(latest.period_end) >= new Date());
      setSub(active ? latest : null);
      if (active && latest) {
        const myScans = await unrufld.entities.Scan.filter({ dentist_id: user.id }, '-created_date', 200);
        setScans(myScans);
      }
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      await unrufld.entities.DentistProfile.create({ ...regForm, user_id: user.id });
      reloadShell?.();
    } catch (err) { console.error(err); } finally { setRegistering(false); }
  };

  const onAddClick = () => {
    setSlotError('');
    if (!sub) { navigate('/dentist-billing'); return; }
    if (assignments.length >= sub.patient_slots) {
      setSlotError(`You've reached your ${sub.patient_slots} patient slot limit. Add more slots in Subscription & Billing.`);
      return;
    }
    setAddOpen(true);
  };

  // Group assignments by patient
  const patientsMap = {};
  assignments.forEach((a) => {
    if (!patientsMap[a.patient_id]) patientsMap[a.patient_id] = { name: a.patient_name, email: a.patient_email, assignments: [] };
    patientsMap[a.patient_id].assignments.push(a);
  });
  const patients = Object.entries(patientsMap);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  // No profile — show registration form
  if (!profile) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-8 h-8 text-olo" />
          </div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">Set up your dentist workspace</h1>
          <p className="text-sm text-muted-foreground mt-2">Create your profile to start receiving patient scan shares.</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4 p-6 rounded-2xl border border-border bg-card">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full name</label>
            <input value={regForm.full_name} onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })} required placeholder="Dr. Jane Smith" className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Practice name</label>
            <input value={regForm.practice_name} onChange={(e) => setRegForm({ ...regForm, practice_name: e.target.value })} placeholder="Bright Smile Dental" className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Specialization</label>
              <input value={regForm.specialization} onChange={(e) => setRegForm({ ...regForm, specialization: e.target.value })} placeholder="Orthodontist" className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">License number</label>
              <input value={regForm.license_number} onChange={(e) => setRegForm({ ...regForm, license_number: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Contact email</label>
            <input type="email" value={regForm.contact_email} onChange={(e) => setRegForm({ ...regForm, contact_email: e.target.value })} placeholder="contact@brightsmile.com" className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Phone</label>
            <input value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Bio</label>
            <textarea value={regForm.bio} onChange={(e) => setRegForm({ ...regForm, bio: e.target.value })} rows={3} placeholder="Tell patients about your practice…" className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none resize-none" />
          </div>
          <DentistAddressFields value={regForm} onChange={setRegForm} />
          <button type="submit" disabled={registering} className="w-full bg-olo text-white font-semibold py-3 rounded-xl hover:scale-[1.01] transition-transform disabled:opacity-50">
            {registering ? 'Creating…' : 'Create profile'}
          </button>
        </form>
      </div>
    );
  }

  const name = profile.full_name || profile.clinic_name || 'Dentist';

  // Patient detail view
  if (selectedPatient) {
    const [pid, pdata] = selectedPatient;
    const patientAssignments = pdata.assignments;
    const primaryAssignment = patientAssignments.find((a) => a.assignment_type === 'primary');
    const canSeePhotos = primaryAssignment?.can_see_photos;
    const patientScans = scans.filter((s) => s.created_by_id === pid);
    const patientShares = shares.filter((s) => s.patient_id === pid);

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => setSelectedPatient(null)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-olo transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to patients
        </button>
        <h1 className="font-heading font-700 text-xl mb-1">{pdata.name}</h1>
        <p className="text-sm text-muted-foreground mb-4">{pdata.email}</p>

        {primaryAssignment && (
          <div className="mb-4 p-3 rounded-xl bg-olo/5 border border-olo/15 flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-olo flex-shrink-0" />
            <span>Primary dentist · {canSeePhotos ? 'Photo access granted' : 'Reports only, no photo access'}</span>
          </div>
        )}

        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {primaryAssignment ? 'All Scan Reports' : 'Shared Scans'}
        </h2>

        {primaryAssignment && patientScans.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No scans yet.</p>
        )}
        {!primaryAssignment && patientShares.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No scans shared with you yet.</p>
        )}

        <div className="space-y-2">
          {primaryAssignment && patientScans.map((scan) => (
            <ScanReportCard key={scan.id} scan={scan} showPhoto={canSeePhotos} />
          ))}
          {!primaryAssignment && patientShares.map((share) => (
            <ScanReportCard key={share.id} scan={share.scan_snapshot} showPhoto={share.share_type === 'report_and_photos'} isSnapshot />
          ))}
        </div>
      </div>
    );
  }

  // Patient list
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-olo" />
          <h1 className="font-heading font-700 text-2xl tracking-tight">My Patients</h1>
        </div>
        <button onClick={onAddClick} className="inline-flex items-center gap-1.5 bg-olo text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-105 transition-transform">
          <UserPlus className="w-4 h-4" /> Add patient
        </button>
      </div>
      <div className="flex items-center gap-1.5 mb-4">
        <span className="text-sm text-muted-foreground">{name}</span>
        {profile.verified && <BadgeCheck className="w-4 h-4 text-olo" />}
        {sub && <span className="text-xs text-muted-foreground">· {assignments.length}/{sub.patient_slots} slots used</span>}
      </div>

      {pending.length > 0 && (
        <Link to="/dentist-pending" className="block mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-sm hover:bg-amber-500/15 transition-colors">
          <Inbox className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-amber-700 dark:text-amber-400 font-medium">{pending.length} pending request{pending.length === 1 ? '' : 's'} awaiting approval</span>
        </Link>
      )}

      {slotError && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span className="text-amber-700 dark:text-amber-400">{slotError}</span>
        </div>
      )}

      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> Active Patients ({patients.length})
      </h2>

      {patients.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No patients yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add a patient by their teewai email to send a request.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map(([pid, pdata]) => {
            const isPrimary = pdata.assignments.some((a) => a.assignment_type === 'primary');
            const hasPhotoAccess = pdata.assignments.find((a) => a.assignment_type === 'primary')?.can_see_photos;
            return (
              <button
                key={pid}
                onClick={() => setSelectedPatient([pid, pdata])}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:border-olo/40 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{pdata.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isPrimary ? 'bg-olo/15 text-olo' : 'bg-muted text-muted-foreground'}`}>
                      {isPrimary ? 'Primary' : 'Secondary'}
                    </span>
                    {isPrimary && (
                      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
                        {hasPhotoAccess ? <><Eye className="w-3 h-3" /> Photos</> : <><EyeOff className="w-3 h-3" /> Reports only</>}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      <AddPatientDialog
        open={addOpen}
        dentistProfile={profile}
        user={user}
        onCreated={() => { setAddOpen(false); load(); }}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}

function ScanReportCard({ scan, showPhoto, isSnapshot }) {
  const date = scan.scan_date || scan.created_date;
  return (
    <div className="p-4 rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-3">
        {showPhoto && scan.image_url ? (
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            <img src={scan.image_url} alt="Scan" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
            <EyeOff className="w-6 h-6 text-muted-foreground/50" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {scan.score != null && <span className="text-sm font-bold text-olo">{scan.score}</span>}
            {scan.shade && <span className="text-xs text-muted-foreground">· {scan.shade}</span>}
            {date && <span className="text-xs text-muted-foreground">{new Date(date).toLocaleDateString()}</span>}
          </div>
          {scan.dental_health_score != null && (
            <p className="text-xs text-muted-foreground mt-1">Health: {scan.dental_health_score}</p>
          )}
          {scan.ai_feedback && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scan.ai_feedback}</p>}
        </div>
      </div>
      {!showPhoto && (
        <p className="text-[11px] text-muted-foreground mt-2 text-center italic">
          {isSnapshot ? 'Report only, patient has not shared photos' : 'Patient has not granted photo access'}
        </p>
      )}
    </div>
  );
}