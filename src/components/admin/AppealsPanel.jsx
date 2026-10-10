import { useState, useEffect } from 'react';
import { Gavel, CheckCircle2, XCircle, Loader2, AlertCircle, Clock, Mail, Tag } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { adminAuth } from '@/lib/adminAuth';
import Spinner from '@/components/Spinner';

// Admin review surface for user-submitted appeals. Lists open/under-review
// appeals with "Lift ban" and "Uphold" actions + a notes field. Lifting
// resolves the appeal as "lifted" AND clears the ban on the linked GuestIp
// record (if one exists for that IP).
//
// Reads/writes go through the entity SDK directly (Appeal read/update RLS is
// Base44-admin only). When the teewai-admin backend functions are restored on
// the plan, this can be routed through them for the custom admin auth system.

const BLOCK_LABELS = {
  guest_post: 'Guest post',
  signup: 'Signup',
  account: 'Account',
  ip_ban: 'IP ban',
};

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AppealsPanel() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await unrufld.entities.Appeal.list('-submitted_date', 200);
      setAppeals(list || []);
    } catch (e) {
      setError(e?.message || 'Failed to load appeals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reviewer = adminAuth.getUser() || 'admin';

  const resolve = async (appeal, status) => {
    setActing(appeal.id);
    setError('');
    try {
      // Lift: clear the ban on the linked GuestIp record first (if any).
      if (status === 'lifted' && appeal.ip_address) {
        try {
          const matches = await unrufld.entities.GuestIp.filter({ ip_address: appeal.ip_address });
          const guestIp = (matches || [])[0];
          if (guestIp && guestIp.banned) {
            await unrufld.entities.GuestIp.update(guestIp.id, {
              banned: false,
              banned_by: null,
              banned_reason: '',
              banned_date: null,
            });
          }
        } catch (e) {
          // Non-fatal — the appeal can still be resolved even if the GuestIp
          // record can't be cleared (e.g. signup/account appeals with no IP).
          console.warn('GuestIp unban failed:', e?.message);
        }
      }
      await unrufld.entities.Appeal.update(appeal.id, {
        status,
        resolved_date: new Date().toISOString(),
        reviewer,
        resolution_notes: notes[appeal.id] || '',
      });
      setNotes((n) => ({ ...n, [appeal.id]: '' }));
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to resolve appeal');
    } finally {
      setActing(null);
    }
  };

  const visible = showResolved
    ? appeals
    : appeals.filter((a) => a.status === 'open' || a.status === 'under_review');
  const openCount = appeals.filter((a) => a.status === 'open' || a.status === 'under_review').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-700 text-xl">Appeals</h2>
        <span className="text-xs text-muted-foreground ml-auto">{openCount} open · {appeals.length} total</span>
      </div>
      <p className="text-sm text-muted-foreground">
        User-submitted appeals against blocks, rate limits, and bans. Lifting clears the ban on the linked IP.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowResolved(false)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${!showResolved ? 'bg-olo text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setShowResolved(true)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${showResolved ? 'bg-olo text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
        >
          All ({appeals.length})
        </button>
        <button onClick={load} className="ml-auto text-xs font-medium text-olo hover:underline">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          {showResolved ? 'No appeals yet.' : 'No open appeals. 🎉'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-olo/10 text-olo">
                    <Tag className="w-2.5 h-2.5" /> {BLOCK_LABELS[a.block_type] || a.block_type}
                  </span>
                  <StatusBadge status={a.status} />
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" /> {timeAgo(a.submitted_date)}
                  </span>
                </div>
                {a.ip_address && (
                  <span className="font-mono text-[11px] text-muted-foreground">{a.ip_address}</span>
                )}
              </div>

              {a.reason_shown && (
                <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg p-2.5 mb-2.5 border border-border">
                  <span className="font-semibold text-foreground">Shown: </span>{a.reason_shown}
                </p>
              )}

              <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{a.user_message}</p>

              {a.contact_email && (
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mb-3">
                  <Mail className="w-3 h-3" /> {a.contact_email}
                </p>
              )}

              {a.status === 'upheld' || a.status === 'lifted' ? (
                <div className="text-xs text-muted-foreground border-t border-border pt-2.5 mt-1">
                  <span className="font-semibold capitalize">{a.status}</span> by {a.reviewer || 'admin'} · {timeAgo(a.resolved_date)}
                  {a.resolution_notes && <p className="mt-1 italic">"{a.resolution_notes}"</p>}
                </div>
              ) : (
                <div className="space-y-2.5 border-t border-border pt-3">
                  <input
                    value={notes[a.id] || ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
                    placeholder="Resolution notes (optional)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-olo/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolve(a, 'lifted')}
                      disabled={acting === a.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-success/10 text-success text-xs font-semibold px-3 py-2 rounded-lg hover:bg-success/20 transition-colors disabled:opacity-50"
                    >
                      {acting === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Lift ban
                    </button>
                    <button
                      onClick={() => resolve(a, 'upheld')}
                      disabled={acting === a.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-destructive/10 text-destructive text-xs font-semibold px-3 py-2 rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50"
                    >
                      {acting === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Uphold
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    open: { label: 'Open', cls: 'bg-warning/10 text-warning' },
    under_review: { label: 'Reviewing', cls: 'bg-chart-2/10 text-chart-2' },
    upheld: { label: 'Upheld', cls: 'bg-destructive/10 text-destructive' },
    lifted: { label: 'Lifted', cls: 'bg-success/10 text-success' },
  };
  const s = map[status] || map.open;
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}