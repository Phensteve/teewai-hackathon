import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, MessageSquare, Mail, Clock } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';

// Appeal submission form — shown when a user is blocked, rate-limited, or
// banned. Lets them tell their side of the story (optional contact email +
// message). The form submits directly to the Appeal entity, whose create RLS
// is open so it works even while the IP is blocked / for unauthenticated
// guests.
//
// NOTE: The IP address is NOT captured client-side (that would be spoofable
// and is forbidden by the compliance spec). The ip_address field is left
// empty here and is populated server-side when the backend logging function
// is available. The 1-open-appeal-per-IP-per-48h limit is enforced as a
// best-effort per-device throttle here; true per-IP enforcement requires the
// backend to read the trusted request IP.

const THROTTLE_HOURS = 48;
const throttleKey = (blockType) => `teewai_appeal_last_${blockType}`;

export default function AppealForm({ open, onClose, blockType = 'ip_ban', reasonShown = '' }) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [throttledUntil, setThrottledUntil] = useState(0);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setError('');
    const last = Number(localStorage.getItem(throttleKey(blockType)) || 0);
    const until = last + THROTTLE_HOURS * 3600 * 1000;
    setThrottledUntil(until > Date.now() ? until : 0);
  }, [open, blockType]);

  if (!open) return null;

  const throttled = throttledUntil > Date.now();
  const remainingH = Math.ceil((throttledUntil - Date.now()) / 3600000);

  const submit = async (e) => {
    e.preventDefault();
    if (throttled) return;
    if (message.trim().length < 10) {
      setError('Please write at least a sentence (10+ characters) so we can review your case.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await unrufld.entities.Appeal.create({
        block_type: blockType,
        reason_shown: reasonShown,
        user_message: message.trim(),
        contact_email: email.trim() || null,
        status: 'open',
        submitted_date: new Date().toISOString(),
      });
      localStorage.setItem(throttleKey(blockType), String(Date.now()));
      setSubmitted(true);
    } catch (err) {
      setError(err?.message || 'Could not submit your appeal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-border bg-card/95 backdrop-blur-md rounded-t-3xl">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-olo/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-olo" />
            </div>
            <div>
              <h2 className="font-heading font-700 text-base leading-tight">Appeal this decision</h2>
              <p className="text-xs text-muted-foreground">Tell us why this was a mistake</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-olo" />
            </div>
            <h3 className="font-heading font-700 text-lg mb-1.5">Appeal submitted</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Our team will review your case. If you left a contact email, we'll reach out with a decision.
            </p>
            <button onClick={onClose} className="w-full bg-olo text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity">
              Done
            </button>
          </div>
        ) : throttled ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-warning" />
            </div>
            <h3 className="font-heading font-700 text-lg mb-1.5">You've already appealed</h3>
            <p className="text-sm text-muted-foreground mb-5">
              You can submit one appeal of this type every {THROTTLE_HOURS} hours. Please wait about {remainingH} hour{remainingH !== 1 ? 's' : ''} for our team to review your current appeal.
            </p>
            <button onClick={onClose} className="w-full border border-border font-medium py-3 rounded-xl hover:bg-muted/50 transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            {reasonShown && (
              <div className="text-xs text-muted-foreground bg-muted/60 rounded-lg p-3 border border-border">
                <span className="font-semibold text-foreground">Decision: </span>{reasonShown}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                autoFocus
                maxLength={2000}
                placeholder="Explain what happened and why you think this block is a mistake…"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm focus:outline-none focus:border-olo/50 resize-none"
              />
              <p className="text-[11px] text-muted-foreground text-right">{message.length}/2000</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Contact email <span className="text-muted-foreground/60 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm focus:outline-none focus:border-olo/50"
              />
              <p className="text-[11px] text-muted-foreground">So we can reach you with a decision.</p>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-2.5">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-olo text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit appeal'}
            </button>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Your appeal is stored securely and reviewed by teewai admins. One appeal per type every {THROTTLE_HOURS} hours.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}