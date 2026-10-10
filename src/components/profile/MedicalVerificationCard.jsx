import { useState, useEffect } from 'react';
import { Stethoscope, Loader2, Check, X, ShieldCheck, Upload, BadgeCheck } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { useToast } from '@/components/ui/use-toast';

const PROFESSIONS = [
  { value: 'dentist', label: 'Dentist' },
  { value: 'dental_hygienist', label: 'Dental hygienist' },
  { value: 'dental_therapist', label: 'Dental therapist' },
  { value: 'orthodontist', label: 'Orthodontist' },
  { value: 'oral_surgeon', label: 'Oral surgeon' },
  { value: 'medical_doctor', label: 'Medical doctor' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'other', label: 'Other' },
];

// Profile section: lets a user submit teewai medical-credential verification.
// Once approved by a medical admin, the user gets a clinician badge in the
// Common Room and may give medical advice (exempt from auto-flagging).
export default function MedicalVerificationCard({ user }) {
  const { toast } = useToast();
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ profession: 'dentist', profession_other: '', license_number: '', country: '', specialization: '', license_document_url: '' });

  const load = async () => {
    setLoading(true);
    try {
      const list = await unrufld.entities.MedicalVerification.filter({ user_id: user?.id }, '-created_date', 5);
      setVerification(list[0] || null);
    } catch { setVerification(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    try {
      const { file_url } = await unrufld.integrations.Core.UploadPublicFile({ file });
      setForm((f) => ({ ...f, license_document_url: file_url }));
      toast({ title: 'Document uploaded' });
    } catch { toast({ title: 'Upload failed', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.license_number.trim() || !form.country.trim()) return;
    if (form.profession === 'other' && !form.profession_other.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        full_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || '',
        email: user.email,
        profession: form.profession,
        profession_other: form.profession === 'other' ? form.profession_other : undefined,
        license_number: form.license_number.trim(),
        country: form.country.trim(),
        specialization: form.specialization.trim() || undefined,
        license_document_url: form.license_document_url || undefined,
        status: 'pending',
        submitted_date: new Date().toISOString(),
      };
      const created = await unrufld.entities.MedicalVerification.create(payload);
      setVerification(created);
      toast({ title: 'Verification submitted', description: 'A teewai medical admin will review it.' });
    } catch (err) {
      toast({ title: 'Could not submit', description: err?.message, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-3xl border border-border bg-card flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-olo animate-spin" />
        <p className="text-sm text-muted-foreground">Loading verification…</p>
      </div>
    );
  }

  // Approved
  if (user?.is_verified_medical || verification?.status === 'approved') {
    return (
      <div className="p-6 rounded-3xl border border-success/30 bg-success/5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-success/15 flex items-center justify-center flex-shrink-0">
            <BadgeCheck className="w-6 h-6 text-success" />
          </div>
          <div>
            <h2 className="font-heading font-700 text-lg flex items-center gap-2">
              Verified medical professional
              <ShieldCheck className="w-4 h-4 text-success" />
            </h2>
            <p className="text-sm text-muted-foreground">
              {verification?.profession?.replace(/_/g, ' ') || user?.medical_profession?.replace(/_/g, ' ') || 'Clinician'} · you may give medical advice in the Common Room.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pending
  if (verification?.status === 'pending') {
    return (
      <div className="p-6 rounded-3xl border border-warning/30 bg-warning/5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-warning/15 flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-6 h-6 text-warning animate-spin" />
          </div>
          <div>
            <h2 className="font-heading font-700 text-lg">Verification under review</h2>
            <p className="text-sm text-muted-foreground">Submitted {verification.submitted_date ? new Date(verification.submitted_date).toLocaleDateString() : ''}. A teewai medical admin will review it shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  // Rejected — allow resubmit
  const rejected = verification?.status === 'rejected';

  return (
    <div className="p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-6 h-6 text-olo" />
        </div>
        <div>
          <h2 className="font-heading font-700 text-lg">Verify as a medical professional</h2>
          <p className="text-sm text-muted-foreground">Verified clinicians can give medical advice in the Common Room and get a clinician badge.</p>
        </div>
      </div>
      {rejected && (
        <div className="mb-4 p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          Your last submission was declined{verification.review_notes ? `: ${verification.review_notes}` : ''}. You can resubmit below.
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Profession</label>
          <select
            value={form.profession}
            onChange={(e) => setForm({ ...form, profession: e.target.value })}
            className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
          >
            {PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {form.profession === 'other' && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Profession (other)</label>
            <input value={form.profession_other} onChange={(e) => setForm({ ...form, profession_other: e.target.value })} className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">License / registration #</label>
            <input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo" placeholder="DCN-12345" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Country of license</label>
            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo" placeholder="Nigeria" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Specialization (optional)</label>
          <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo" placeholder="Cosmetic dentistry" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">License document (photo / scan)</label>
          <div className="mt-2 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium hover:border-olo/40 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" /> {form.license_document_url ? 'Replace' : 'Upload'}
              <input type="file" accept="image/*,application/pdf" onChange={onFile} className="hidden" />
            </label>
            {form.license_document_url && <span className="text-xs text-success inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Uploaded</span>}
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={submitting || !form.license_number.trim() || !form.country.trim()} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Submit for review
          </button>
        </div>
      </form>
    </div>
  );
}