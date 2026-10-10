import { useState } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { dentistProfiles } from '@/lib/insforgeDb';
import { Stethoscope, Loader2, Building2, Award, FileText } from 'lucide-react';

export default function DentistOnboarding({ user, onCreated }) {
  const [form, setForm] = useState({ clinic_name: '', specialization: '', license_number: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await dentistProfiles.create({ ...form, user_id: user.id });
      onCreated();
    } catch (err) {
      setError(err.message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
          <Stethoscope className="w-8 h-8 text-olo" />
        </div>
        <h1 className="font-heading font-700 text-3xl tracking-tight">Set up your dentist portal</h1>
        <p className="text-muted-foreground mt-2">Tell us about your practice to start managing your clients' smiles.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 p-6 rounded-3xl border border-border bg-card">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Building2 className="w-4 h-4 text-olo" /> Clinic name</label>
          <input
            value={form.clinic_name}
            onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
            required
            placeholder="Bright Smile Dental"
            className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><Award className="w-4 h-4 text-olo" /> Specialization</label>
            <input
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              placeholder="Cosmetic dentistry"
              className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-olo" /> License number</label>
            <input
              value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })}
              placeholder="DEN-00000"
              className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            placeholder="A short introduction for your clients…"
            className="w-full p-4 rounded-xl border border-border bg-background focus:border-olo focus:outline-none resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold h-12 rounded-xl hover:scale-[1.02] transition-transform olo-glow disabled:opacity-50"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Create my portal'}
        </button>
      </form>
    </div>
  );
}