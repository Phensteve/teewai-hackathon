import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { Building2, Loader2, Check, MapPin } from 'lucide-react';

export default function DentistPracticeProfile() {
  const { user, profile, reload } = useOutletContext();
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    practice_name: profile?.practice_name || '',
    clinic_name: profile?.clinic_name || '',
    specialization: profile?.specialization || '',
    license_number: profile?.license_number || '',
    contact_email: profile?.contact_email || '',
    phone: profile?.phone || '',
    bio: profile?.bio || '',
    address: profile?.address || '',
    city: profile?.city || '',
    accepting_patients: profile?.accepting_patients ?? true,
    booking_enabled: profile?.booking_enabled ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await unrufld.entities.DentistProfile.update(profile.id, form);
      setSaved(true);
      reload?.();
    } catch (err) {
      setError(err?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, opts = {}) => (
    <div key={key}>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <input
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        {...opts}
        className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none"
      />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-5 h-5 text-olo" />
        <h1 className="font-heading font-700 text-2xl tracking-tight">Practice Profile</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">This is what patients see in the directory.</p>

      <form onSubmit={submit} className="space-y-4 p-6 rounded-2xl border border-border bg-card">
        {field('full_name', 'Full name', { required: true, placeholder: 'Dr. Jane Smith' })}
        {field('practice_name', 'Practice name', { placeholder: 'Bright Smile Dental' })}
        {field('clinic_name', 'Clinic name')}
        <div className="grid sm:grid-cols-2 gap-4">
          {field('specialization', 'Specialization', { placeholder: 'Orthodontist' })}
          {field('license_number', 'License number')}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {field('contact_email', 'Contact email', { type: 'email' })}
          {field('phone', 'Phone')}
        </div>
        {field('address', 'Clinic address')}
        {field('city', 'City')}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none resize-none"
          />
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.accepting_patients} onChange={(e) => setForm({ ...form, accepting_patients: e.target.checked })} className="accent-olo" />
            Accepting new patients
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.booking_enabled} onChange={(e) => setForm({ ...form, booking_enabled: e.target.checked })} className="accent-olo" />
            Online booking
          </label>
        </div>

        {saved && <p className="text-sm text-olo flex items-center gap-1.5"><Check className="w-4 h-4" /> Saved.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold h-12 rounded-xl hover:scale-[1.01] transition-transform disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
        </button>
      </form>
    </div>
  );
}