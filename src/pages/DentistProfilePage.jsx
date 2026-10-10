import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import ConsentDialog from '@/components/dentist/ConsentDialog';
import Spinner from '@/components/Spinner';
import BackButton from '@/components/BackButton';
import { BadgeCheck, Stethoscope, MapPin, Phone, Mail, Star, UserPlus } from 'lucide-react';

export default function DentistProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dentist, setDentist] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [existingAssignment, setExistingAssignment] = useState(null);
  const [consentType, setConsentType] = useState(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await unrufld.auth.me();
        setUser(me);
        const d = await unrufld.entities.DentistProfile.get(id);
        setDentist(d);
        const assignments = await unrufld.entities.DentistAssignment.filter({ created_by_id: me.id, dentist_id: id });
        const active = assignments.find((a) => a.status === 'active');
        setExistingAssignment(active || null);
      } catch { /* non-fatal */ } finally { setLoading(false); }
    })();
  }, [id]);

  const handleConsent = async () => {
    setAssigning(true);
    try {
      if (consentType === 'primary') {
        // Enforce one primary dentist: revoke existing active primary
        const myPrimaries = await unrufld.entities.DentistAssignment.filter({
          created_by_id: user.id, assignment_type: 'primary', status: 'active'
        });
        for (const a of myPrimaries) {
          await unrufld.entities.DentistAssignment.update(a.id, { status: 'revoked' });
          if (a.dentist_user_id) {
            await unrufld.entities.Scan.updateMany(
              { created_by_id: user.id, dentist_id: a.dentist_user_id },
              { $unset: { dentist_id: "" } }
            );
          }
        }
      }

      await unrufld.entities.DentistAssignment.create({
        patient_id: user.id,
        patient_email: user.email,
        patient_name: user.full_name || user.email,
        dentist_id: dentist.id,
        dentist_user_id: dentist.user_id,
        dentist_name: dentist.full_name || dentist.clinic_name,
        assignment_type: consentType,
        status: 'active',
        consent_given: true,
        consent_date: new Date().toISOString(),
      });

      // Primary dentist: grant RLS read access to all patient's scans
      if (consentType === 'primary') {
        await unrufld.entities.Scan.updateMany(
          { created_by_id: user.id },
          { $set: { dentist_id: dentist.user_id } }
        );
      }

      setConsentType(null);
      navigate('/my-dentists');
    } catch (e) {
      console.error('Assignment failed:', e);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!dentist) return <p className="text-center py-12 text-muted-foreground">Dentist not found.</p>;

  const name = dentist.full_name || dentist.clinic_name || 'Dentist';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <BackButton fallback="/dentists" className="mb-4" />
      <div className="p-5 rounded-2xl border border-border bg-card mb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-olo/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {dentist.profile_picture ? (
              <img src={dentist.profile_picture} alt={name} className="w-full h-full object-cover" />
            ) : (
              <Stethoscope className="w-8 h-8 text-olo" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-heading font-700 text-xl">{name}</h1>
              {dentist.verified && <BadgeCheck className="w-5 h-5 text-olo" />}
            </div>
            {dentist.specialization && <p className="text-sm text-olo font-medium">{dentist.specialization}</p>}
            {(dentist.practice_name || dentist.clinic_name) && (
              <p className="text-sm text-muted-foreground mt-0.5">{dentist.practice_name || dentist.clinic_name}</p>
            )}
          </div>
        </div>
        {dentist.bio && <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{dentist.bio}</p>}
        <div className="mt-4 space-y-1.5 text-sm">
          {dentist.address && <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4 text-olo flex-shrink-0" /> {dentist.address}</p>}
          {dentist.phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 text-olo flex-shrink-0" /> {dentist.phone}</p>}
          {dentist.contact_email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4 text-olo flex-shrink-0" /> {dentist.contact_email}</p>}
        </div>
      </div>

      {existingAssignment ? (
        <div className="p-4 rounded-2xl border border-olo/30 bg-olo/5 text-center">
          <p className="text-sm font-medium text-olo">
            {existingAssignment.assignment_type === 'primary' ? 'Your primary dentist' : 'Your secondary dentist'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Manage this assignment in My Dentists.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => setConsentType('primary')}
            className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-5 py-3 rounded-xl hover:scale-[1.01] transition-transform"
          >
            <Star className="w-4 h-4" /> Assign as my primary dentist
          </button>
          <button
            onClick={() => setConsentType('secondary')}
            className="w-full inline-flex items-center justify-center gap-2 border border-olo/30 text-olo font-semibold px-5 py-3 rounded-xl hover:bg-olo/5 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Add as secondary dentist
          </button>
        </div>
      )}

      <ConsentDialog
        open={!!consentType}
        dentist={dentist}
        assignmentType={consentType}
        onConsent={handleConsent}
        onCancel={() => setConsentType(null)}
        loading={assigning}
      />
    </div>
  );
}