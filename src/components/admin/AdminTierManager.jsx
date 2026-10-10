import { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, Save, UserCog } from 'lucide-react';
import { adminAuth } from '@/lib/adminAuth';
import { PRIVILEGES, PRIVILEGE_KEYS, TIER_PRIVILEGES, TIER_LABELS } from '@/lib/adminPrivileges';
import { useToast } from '@/components/ui/use-toast';

// Super-admin panel to create an admin tier by checking privileges. Lists
// every admin, lets the super admin pick a tier (which pre-fills the tier's
// privilege preset) and toggle individual privileges on or off before
// saving. Stored overrides win over the tier preset on the backend.
export default function AdminTierManager() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tier, setTier] = useState('admin');
  const [privs, setPrivs] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([adminAuth.listAdmins(), adminAuth.listAdminPrivileges()]);
      const privMap = p?.privileges || {};
      const list = (a?.admins || []).map((ad) => ({ ...ad, privileges: privMap[ad.username] || null }));
      setAdmins(list);
      if (!selected && list[0]) selectAdmin(list[0]);
    } catch (e) { toast({ title: 'Load failed', description: e?.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const selectAdmin = (ad) => {
    setSelected(ad);
    const baseTier = ad.role || 'admin';
    setTier(baseTier);
    setPrivs(ad.privileges && ad.privileges.length >= 0 ? ad.privileges : TIER_PRIVILEGES[baseTier] || []);
  };

  const pickTier = (t) => {
    setTier(t);
    setPrivs(TIER_PRIVILEGES[t] || []);
  };

  const toggle = (key) => {
    setPrivs((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if (tier !== selected.role) {
        await adminAuth.setAdminRole(selected.username, tier);
      }
      await adminAuth.setAdminPrivileges(selected.username, privs);
      toast({ title: 'Tier & privileges saved' });
      load();
    } catch (e) { toast({ title: 'Save failed', description: e?.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-olo animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <UserCog className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-700 text-xl">Admin tiers & privileges</h2>
      </div>
      <p className="text-sm text-muted-foreground">Pick an admin, choose a tier, then check the privileges they should have.</p>

      <div className="grid sm:grid-cols-[200px_1fr] gap-4">
        {/* Admin list */}
        <div className="space-y-1">
          {admins.map((ad) => (
            <button
              key={ad.username}
              onClick={() => selectAdmin(ad)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${selected?.username === ad.username ? 'border-olo bg-olo/5' : 'border-border hover:border-olo/30'}`}
            >
              <p className="text-sm font-medium truncate">{ad.username}</p>
              <p className="text-[11px] text-muted-foreground">{TIER_LABELS[ad.role] || ad.role}</p>
            </button>
          ))}
        </div>

        {/* Editor */}
        {selected && (
          <div className="p-5 rounded-2xl border border-border bg-card space-y-5">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Admin</p>
              <p className="font-heading font-700 text-base">{selected.username}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tier</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TIER_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => pickTier(key)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${tier === key ? 'border-olo bg-olo/10 text-olo' : 'border-border hover:border-olo/30'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Privileges</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {PRIVILEGE_KEYS.map((key) => {
                  const on = privs.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(key)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${on ? 'border-olo bg-olo/5' : 'border-border hover:border-olo/30'}`}
                    >
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${on ? 'border-olo bg-olo' : 'border-border'}`}>
                        {on && <ShieldCheck className="w-3 h-3 text-white" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{key.replace(/_/g, ' ')}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">{PRIVILEGES[key]}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save tier
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}