import { useState, useEffect } from 'react';
import { PenLine, Loader2, BadgeCheck, ShieldCheck } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { useToast } from '@/components/ui/use-toast';

// Profile/Apply section: lets a user apply to become a verified teewai
// blogger. Once approved by a content admin / super admin, the author's
// community blog posts show a verified badge.
export default function BlogVerificationCard({ user }) {
  const { toast } = useToast();
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ bio: '', sample_url: '' });

  const load = async () => {
    setLoading(true);
    try {
      const list = await unrufld.entities.BlogVerification.filter({ user_id: user?.id }, '-created_date', 5);
      setVerification(list[0] || null);
    } catch { setVerification(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.bio.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        full_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.display_name || '',
        email: user.email,
        bio: form.bio.trim(),
        sample_url: form.sample_url.trim() || undefined,
        status: 'pending',
        submitted_date: new Date().toISOString(),
      };
      const created = await unrufld.entities.BlogVerification.create(payload);
      setVerification(created);
      setForm({ bio: '', sample_url: '' });
      toast({ title: 'Application submitted', description: 'A teewai content admin will review it.' });
    } catch (err) {
      toast({ title: 'Could not submit', description: err?.message, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-3xl border border-border bg-card flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-olo animate-spin" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (verification?.status === 'approved') {
    return (
      <div className="p-6 rounded-3xl border border-success/30 bg-success/5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-success/15 flex items-center justify-center flex-shrink-0">
            <BadgeCheck className="w-6 h-6 text-success" />
          </div>
          <div>
            <h2 className="font-heading font-700 text-lg flex items-center gap-2">
              Verified blogger <ShieldCheck className="w-4 h-4 text-success" />
            </h2>
            <p className="text-sm text-muted-foreground">You're a verified teewai blogger — your posts show a verified badge.</p>
          </div>
        </div>
      </div>
    );
  }

  if (verification?.status === 'pending') {
    return (
      <div className="p-6 rounded-3xl border border-warning/30 bg-warning/5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-warning/15 flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-6 h-6 text-warning animate-spin" />
          </div>
          <div>
            <h2 className="font-heading font-700 text-lg">Application under review</h2>
            <p className="text-sm text-muted-foreground">Submitted {verification.submitted_date ? new Date(verification.submitted_date).toLocaleDateString() : ''}. A content admin will review it shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  const rejected = verification?.status === 'rejected';

  return (
    <div className="p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center flex-shrink-0">
          <PenLine className="w-6 h-6 text-olo" />
        </div>
        <div>
          <h2 className="font-heading font-700 text-lg">Apply to be a verified blogger</h2>
          <p className="text-sm text-muted-foreground">Verified bloggers get a badge on their posts and can publish community stories.</p>
        </div>
      </div>
      {rejected && (
        <div className="mb-4 p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          Your last application was declined{verification.review_notes ? `: ${verification.review_notes}` : ''}. You can reapply below.
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Why do you want to write? (bio)</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={4}
            className="mt-2 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo resize-y"
            placeholder="Tell us about yourself and what you'd write about…"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Sample writing link (optional)</label>
          <input
            value={form.sample_url}
            onChange={(e) => setForm({ ...form, sample_url: e.target.value })}
            className="mt-2 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
            placeholder="https://…"
          />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={submitting || !form.bio.trim()} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Submit application
          </button>
        </div>
      </form>
    </div>
  );
}