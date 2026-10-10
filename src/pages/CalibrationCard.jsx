import { useState, useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';
import BackButton from '@/components/BackButton';
import Spinner from '@/components/Spinner';
import { CreditCard, Check, Mail, ShieldCheck, Truck } from 'lucide-react';

// Physical calibration card request (precision moat). A mailed, proprietary
// white reference card standardizes lighting across any phone — the one
// accuracy layer a software-only competitor can't copy. Requests are stored
// per-user; admins fulfill shipments by flipping status to shipped/delivered.

export default function CalibrationCard() {
  const [me, setMe] = useState(null);
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', address: '', city: '', country: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const m = await unrufld.auth.me().catch(() => null);
        setMe(m);
        if (m) {
          const reqs = await unrufld.entities.CalibrationCardRequest.filter({}, '-created_date', 10).catch(() => []);
          if (reqs.length) { setExisting(reqs[0]); setDone(true); }
          setForm((f) => ({
            ...f,
            full_name: m.full_name || f.full_name,
            email: m.email || f.email,
          }));
        }
      } catch (e) {
        setError('Could not load your request. Please try again.');
      } finally { setLoading(false); }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await unrufld.entities.CalibrationCardRequest.create(form);
      setDone(true);
    } catch (e) {
      setError(e?.message || 'Could not submit your request. Please try again.');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <BackButton fallback="/dashboard" className="mb-4" />
        <div className="mt-10 flex justify-center"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BackButton fallback="/reference-material" className="mb-4" />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-olo" />
        </div>
        <div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">Calibration card</h1>
          <p className="text-sm text-muted-foreground">The physical reference that makes every scan honest.</p>
        </div>
      </div>

      {/* Why it matters */}
      <div className="p-5 rounded-3xl border border-olo/20 bg-gradient-to-br from-olo/8 to-card mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-heading font-600 text-base mb-1">Why a physical card?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every phone camera renders color differently. A mailed teewai card has a <strong className="text-foreground">known, fixed white</strong> that
              sits next to your teeth in the same light — so teewai calibrates against the same truth on <em>any</em> device, in <em>any</em> room.
              It's the accuracy moat a software-only app simply can't copy.
            </p>
          </div>
        </div>
      </div>

      {done ? (
        <div className="p-6 rounded-3xl border border-olo/30 bg-olo/5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-olo flex items-center justify-center mx-auto mb-4 olo-glow">
            <Check className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-heading font-700 text-lg mb-1">Request received!</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            Your teewai calibration card is on its way to <strong className="text-foreground">{existing?.city || 'you'}</strong>.
            We'll ship it as soon as the next batch is ready.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground">
            <Truck className="w-3.5 h-3.5 text-olo" /> Status: <span className="text-olo font-medium capitalize">{existing?.status || 'requested'}</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Once it arrives, hold it next to your teeth when you scan for lab-grade color calibration.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="p-5 rounded-3xl border border-border bg-card space-y-4">
          <h2 className="font-heading font-600 text-base">Request your free card</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Full name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required
                className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
                className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Shipping address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required placeholder="House no, street, area"
                className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Country</label>
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required placeholder="Nigeria"
                className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white text-sm font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 olo-glow">
            {saving ? <Spinner size={16} /> : <Mail className="w-4 h-4" />} Request my free card
          </button>
          <p className="text-xs text-muted-foreground text-center">Free · no shipping fee. We only use your address to send the card.</p>
          {error && <p className="text-sm text-destructive text-center mt-1">{error}</p>}
        </form>
      )}
    </div>
  );
}