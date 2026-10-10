import { useState } from 'react';
import { ShieldAlert, X, Loader2, MessageSquare } from 'lucide-react';

// Modal for a user to dispute an auto-flag on their message. The dispute is
// filed through the communityPost backend (op: dispute) which sets
// flag_status=disputed + dispute_status=pending for a medical admin to review.
export default function DisputeModal({ open, onClose, onConfirm, message, submitting }) {
  const [text, setText] = useState('');
  if (!open) return null;
  const submit = (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    onConfirm(text.trim());
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-up">
      <div className="relative w-full max-w-md bg-background sm:rounded-3xl rounded-t-3xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>
            <h2 className="font-heading font-700 text-base">Dispute this flag</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="px-5 py-5 space-y-4">
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Your message
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">{message?.content}</p>
            {message?.flag_reason && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">Flagged as: {message.flag_reason}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Why shouldn't this be flagged?</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={1000}
              autoFocus
              placeholder="I was sharing my own experience, not giving medical advice…"
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed focus:outline-none focus:border-olo/50 focus:ring-1 focus:ring-olo/20"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="inline-flex items-center gap-2 bg-olo text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
              Submit dispute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}