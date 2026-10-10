import { useEffect, useState } from 'react';
import { usersMirror } from '@/lib/insforgeDb';
import { Download, Users, Loader2, RefreshCw } from 'lucide-react';

export default function IdentityMirrorPanel() {
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await usersMirror.list('-created_date', 1000));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportJson = () => {
    const payload = (users || []).map((u) => ({
      user_id: u.user_id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      last_seen: u.last_seen,
      base44_created_date: u.base44_created_date || null,
      mirrored_at: u.created_date,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teewai-users-mirror.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 rounded-3xl border border-border bg-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-lg">Identity mirror</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/5 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportJson}
            disabled={!users?.length}
            className="inline-flex items-center gap-2 bg-olo/10 text-olo font-medium px-3 py-2 rounded-xl text-sm hover:bg-olo/20 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Auto-synced Base44 user profiles (email, name, role). Portable to any platform — pair with a passwordless login there so users skip the password reset. Passwords are never stored; no auth provider exposes them.
      </p>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : !users?.length ? (
        <div className="p-6 rounded-2xl border border-dashed border-border text-center text-muted-foreground text-sm">
          No users mirrored yet. They sync automatically as users open the app.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''} mirrored</p>
          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background text-sm">
                <div className="w-8 h-8 rounded-lg bg-olo/10 flex items-center justify-center text-olo font-semibold text-xs flex-shrink-0">
                  {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email || '—'}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${u.role === 'admin' ? 'bg-olo/15 text-olo' : 'bg-muted text-muted-foreground'}`}>
                  {u.role || 'user'}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline flex-shrink-0">
                  {u.last_seen ? new Date(u.last_seen).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}