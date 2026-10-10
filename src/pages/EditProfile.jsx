import { useEffect, useState } from 'react';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { useNavigate, Link } from 'react-router-dom';
import { userProfile } from '@/lib/insforgeDb';
import { unrufld } from '@/api/unrufldClient';
import { ArrowLeft, Save, Loader2, Check, Smile, Trash2, ShieldCheck } from 'lucide-react';
import SelectSheet from '@/components/SelectSheet';

const HOW_FOUND_OPTIONS = [
  { value: 'friend', label: 'Friend or family' },
  { value: 'social', label: 'Social media' },
  { value: 'search', label: 'Google search' },
  { value: 'dentist', label: 'My dentist' },
  { value: 'app_store', label: 'App store' },
  { value: 'other', label: 'Other' },
];

const APPLIANCE_OPTIONS = [
  { value: 'metal_braces', label: 'Metal braces', desc: 'Traditional brackets' },
  { value: 'ceramic_braces', label: 'Ceramic braces', desc: 'Clear brackets' },
  { value: 'lingual_braces', label: 'Lingual braces', desc: 'Behind the teeth' },
  { value: 'clear_aligners', label: 'Clear aligners', desc: 'Like Invisalign' },
  { value: 'hawley_retainer', label: 'Hawley retainer', desc: 'Wire + acrylic' },
  { value: 'clear_retainer', label: 'Clear retainer', desc: 'Plastic tray' },
  { value: 'fixed_retainer', label: 'Fixed retainer', desc: 'Bonded wire' },
];

export default function EditProfile() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [howFound, setHowFound] = useState('');
  const [wearsAppliance, setWearsAppliance] = useState(false);
  const [applianceType, setApplianceType] = useState('');
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await userProfile.get().catch(() => null);
        setMe(user);
        setName(user?.display_name || '');
        setFirstName(user?.first_name || '');
        setLastName(user?.last_name || '');
        setPhone(user?.phone_number || '');
        setHowFound(user?.how_found || '');
        setWearsAppliance(!!user?.wears_appliance);
        setApplianceType(user?.appliance_type && user.appliance_type !== 'none' ? user.appliance_type : '');
        setLeaderboardOptOut(!!user?.leaderboard_opt_out);
      } catch {
        // Swallow errors
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        display_name: name.trim() || undefined,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone_number: phone.trim() || undefined,
        how_found: howFound || undefined,
        wears_appliance: wearsAppliance,
        appliance_type: wearsAppliance && applianceType ? applianceType : 'none',
        leaderboard_opt_out: leaderboardOptOut,
      };
      await userProfile.update(payload);
      setMe((prev) => prev ? { ...prev, ...payload } : prev);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        navigate('/profile');
      }, 1000);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    setDelError('');
    try {
      await unrufld.functions.invoke('deleteAccount', {});
      await unrufld.auth.logout('/login');
    } catch (e) {
      setDelError(e?.message || 'Could not delete account');
      setDeleting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-2xl mx-auto space-y-6 overflow-x-hidden">
      <Link
        to="/profile"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to profile
      </Link>

      <h1 className="text-h1">Edit profile</h1>

      <div className="p-6 rounded-3xl border border-border bg-card space-y-4">
        <div>
          <label className="text-label text-muted-foreground">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-base focus:outline-none focus:border-olo"
            placeholder="Shown on the leaderboard"
          />
          <p className="text-caption text-muted-foreground mt-1.5">Shown on the leaderboard to keep your score private.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-label text-muted-foreground">First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-2 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-base focus:outline-none focus:border-olo" placeholder="Ada" />
          </div>
          <div>
            <label className="text-label text-muted-foreground">Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-2 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-base focus:outline-none focus:border-olo" placeholder="Okafor" />
          </div>
        </div>
        <div>
          <label className="text-label text-muted-foreground">Phone number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="mt-2 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-base focus:outline-none focus:border-olo" placeholder="+234 801 234 5678" />
        </div>
        <div>
          <label className="text-label text-muted-foreground">How did you find out about us?</label>
          <SelectSheet
            value={howFound}
            onChange={setHowFound}
            options={HOW_FOUND_OPTIONS}
            title="How did you find us?"
            className="mt-2"
          />
        </div>

        {/* Braces / retainer */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Smile className="w-4 h-4 text-olo" />
            <label className="text-label text-muted-foreground">Braces or retainer</label>
          </div>
          <button
            type="button"
            onClick={() => { setWearsAppliance(!wearsAppliance); if (wearsAppliance) setApplianceType(''); }}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${wearsAppliance ? 'border-olo bg-olo/5' : 'border-border bg-background'}`}
          >
            <span className="text-sm font-medium">I wear braces or a retainer</span>
            <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${wearsAppliance ? 'border-olo bg-olo' : 'border-border'}`}>
              {wearsAppliance && <Check className="w-3.5 h-3.5 text-white" />}
            </span>
          </button>
          {wearsAppliance && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              {APPLIANCE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setApplianceType(o.value)}
                  className={`text-left p-3 rounded-xl border transition-all ${applianceType === o.value ? 'border-olo bg-olo/10' : 'border-border bg-background hover:border-olo/40'}`}
                >
                  <p className="font-medium text-xs leading-tight">{o.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{o.desc}</p>
                </button>
              ))}
            </div>
          )}
          {wearsAppliance && !applianceType && (
            <p className="text-caption text-warning mt-2">Pick the type that matches yours so we can tailor your brushing advice.</p>
          )}
        </div>

        {/* Leaderboard visibility */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-olo" />
            <label className="text-label text-muted-foreground">Leaderboard &amp; privacy</label>
          </div>
          <button
            type="button"
            onClick={() => setLeaderboardOptOut(!leaderboardOptOut)}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${!leaderboardOptOut ? 'border-olo bg-olo/5' : 'border-border bg-background'}`}
          >
            <div className="text-left min-w-0">
              <span className="text-sm font-medium block">Show me on the leaderboard</span>
              <span className="text-xs text-muted-foreground mt-0.5 block">When off, you won't appear in any public ranking. Your scans still count privately.</span>
            </div>
            <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ml-3 ${!leaderboardOptOut ? 'border-olo bg-olo' : 'border-border'}`}>
              {!leaderboardOptOut && <Check className="w-3.5 h-3.5 text-white" />}
            </span>
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Delete account */}
      <div className="p-6 rounded-3xl border border-danger/30 bg-danger/5">
        <h2 className="text-h3 text-danger mb-1">Delete account</h2>
        <p className="text-caption text-muted-foreground mb-4">Permanently deletes your scans, photos, progress, subscription and profile data. This cannot be undone.</p>
        {delError && <p className="text-caption text-danger mb-3">{delError}</p>}
        {confirmDelete ? (
          <div className="p-4 rounded-2xl border border-danger/40 bg-card animate-fade-up">
            <p className="text-caption font-medium">Are you sure? This permanently erases all your scans, photos and data. This cannot be undone.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={deleteAccount} disabled={deleting} className="inline-flex items-center gap-2 bg-danger text-danger-foreground font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Yes, delete it
              </button>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="px-5 py-2.5 rounded-xl border border-border font-medium hover:bg-muted transition-colors">
                Keep my account
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} disabled={deleting} className="inline-flex items-center gap-2 border border-danger/40 text-danger font-medium px-5 py-2.5 rounded-xl hover:bg-danger/10 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> Delete my account
          </button>
        )}
      </div>
    </div>
  );
}