import { useEffect, useState } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import { Users, UserPlus, Trash2, Loader2, Crown, Shield, Eye } from 'lucide-react';

const ROLES = [
  { id: 'super_admin', label: 'Super admin', icon: Crown, desc: 'Full control — manage admins & roles' },
  { id: 'admin', label: 'Admin', icon: Shield, desc: 'Manage users & coupons' },
  { id: 'viewer', label: 'Viewer', icon: Eye, desc: 'Read-only access' },
];

const ROLE_STYLE = {
  super_admin: 'bg-olo/15 text-olo',
  admin: 'bg-chart-2/10 text-chart-2',
  viewer: 'bg-muted text-muted-foreground',
};

function RoleBadge({ role }) {
  const r = ROLES.find((x) => x.id === role) || ROLES[1];
  const Icon = r.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${ROLE_STYLE[role] || ROLE_STYLE.admin}`}>
      <Icon className="w-3 h-3" /> {r.label}
    </span>
  );
}

export default function AdminManagement({ callerRole }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [changingRole, setChangingRole] = useState('');

  const isSuper = callerRole === 'super_admin';

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAuth.listAdmins();
      setAdmins(res.admins || []);
    } catch (e) {
      setError(e?.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || password.length < 8) {
      setError('Username and a password of at least 8 characters are required.');
      return;
    }
    setAdding(true);
    try {
      await adminAuth.addAdmin(username.trim(), password, newRole);
      setUsername('');
      setPassword('');
      setNewRole('admin');
      await load();
    } catch (err) {
      setError(err?.message || 'Could not add admin');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Remove admin "${u.username}"?`)) return;
    try {
      await adminAuth.removeAdmin(u.username);
      await load();
    } catch (e) {
      setError(e?.message || 'Could not remove admin');
    }
  };

  const changeRole = async (u, role) => {
    setChangingRole(u.username);
    try {
      await adminAuth.setAdminRole(u.username, role);
      await load();
    } catch (e) {
      setError(e?.message || 'Could not change role');
    } finally {
      setChangingRole('');
    }
  };

  const current = adminAuth.getUser();

  return (
    <div>
      {isSuper ? (
        <form onSubmit={add} className="p-6 rounded-3xl border border-border bg-card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-olo" />
            <h2 className="font-heading font-600 text-lg">Add admin</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="newadmin"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Password (min 8 chars)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Level</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          <button
            type="submit"
            disabled={adding}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-xl hover:scale-[1.01] transition-transform olo-glow disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Add admin
          </button>
        </form>
      ) : (
        <div className="p-5 rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground mb-6">
          Only super admins can add or remove admins. You are signed in as <span className="font-semibold text-foreground">{current}</span> ({callerRole}).
        </div>
      )}

      <div>
        <h2 className="font-heading font-600 text-lg mb-3">Admins ({admins.length})</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {admins.map((a) => (
              <div key={a.username} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-olo" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-700 text-sm">
                    {a.username}
                    {a.username === current && <span className="text-xs text-olo font-medium ml-2">(you)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.created_at ? `Added ${new Date(a.created_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <RoleBadge role={a.role} />
                {isSuper ? (
                  <select
                    value={a.role || 'admin'}
                    disabled={changingRole === a.username}
                    onChange={(e) => changeRole(a, e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:border-olo"
                    title="Change level"
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                ) : null}
                <button
                  onClick={() => remove(a)}
                  disabled={!isSuper || a.username === current}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={!isSuper ? 'Super admins only' : a.username === current ? 'You cannot remove yourself' : 'Remove admin'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      </div>

      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        {ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.id} className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${ROLE_STYLE[r.id].split(' ')[1]}`} />
                <p className="font-heading font-600 text-sm">{r.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}