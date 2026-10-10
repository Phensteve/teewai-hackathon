import { useEffect, useState } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import { ScrollText, Loader2, RefreshCw } from 'lucide-react';

const ACTION_LABELS = {
  updateUser: 'edited the profile of',
  setUserStatus: 'changed the account status of',
  addAdmin: 'added a new admin:',
  removeAdmin: 'removed admin:',
  setAdminRole: 'changed the role of admin:',
  grantScans: 'granted scans to',
};

export default function AdminAuditLog() {
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminAuth.listAuditLog();
      setEntries(data.entries || []);
    } catch (e) {
      setError(e?.message || 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-lg">Activity log</h2>
          {entries && <span className="text-xs text-muted-foreground">{entries.length} entries</span>}
        </div>
        <button onClick={load} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/5 transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
      ) : error ? (
        <p className="text-sm text-destructive py-6 text-center">{error}</p>
      ) : !entries?.length ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center text-muted-foreground text-sm">
          No admin activity recorded yet. Edits, suspensions, and admin changes appear here automatically.
        </div>
      ) : (
        <div className="space-y-2 max-h-[80vh] overflow-y-auto pr-1">
          {entries.map((e, i) => (
            <div key={e.id || i} className="p-3.5 rounded-2xl border border-border bg-background">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm">
                  <span className="font-semibold">{e.admin_username}</span>{' '}
                  <span className="text-muted-foreground">{ACTION_LABELS[e.action] || e.action}</span>{' '}
                  <span className="font-medium text-foreground">{e.target_label || e.target}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {e.timestamp ? new Date(e.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
              {e.details && (
                <p className="text-xs text-muted-foreground mt-1.5">{e.details}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}