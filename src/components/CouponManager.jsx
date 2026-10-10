import { useEffect, useState } from 'react';
import { coupons as insforgeCoupons } from '@/lib/insforgeDb';
import { Tag, Trash2, Plus, Loader2, Power, Pencil } from 'lucide-react';
import { influencerCall } from '@/lib/influencers';
import CouponInfluencerAction from '@/components/influencers/CouponInfluencerAction';

const empty = { code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_date: '', description: '' };

export default function CouponManager({ callerRole = 'admin', campaignTarget = null, onLinked }) {
  const canCreate = callerRole === 'super_admin';
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(empty);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editMax, setEditMax] = useState('');
  const [savingMax, setSavingMax] = useState(false);
  const [campaigns, setCampaigns] = useState({});

  const load = async () => {
    try {
      const list = await insforgeCoupons.list('-created_date', 100);
      setCoupons(list);
      const linked = await influencerCall('couponCampaigns', { coupon_ids: list.map(c => c.id) }, true);
      setCampaigns(Object.fromEntries(linked.items.map(c => [c.coupon_id, c])));
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load coupons.');
      setCoupons([]);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setError('');
    if (!form.code.trim() || !form.discount_value) {
      setError('Code and discount value are required.');
      return;
    }
    setCreating(true);
    try {
      const coupon = await insforgeCoupons.create({
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : 0,
        expires_date: form.expires_date ? new Date(form.expires_date).toISOString() : null,
        description: form.description.trim(),
        active: true,
        used_count: 0,
      });
      if (campaignTarget) {
        await influencerCall('linkCoupon', { campaign_id: campaignTarget.id, coupon_id: coupon.id }, true);
        onLinked?.();
      }
      setForm(empty);
      await load();
    } catch (e) {
      setError(e?.message || 'Could not create coupon.');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (c) => {
    await insforgeCoupons.update(c.id, { active: !c.active });
    await load();
  };

  const remove = async (c) => {
    await insforgeCoupons.remove(c.id);
    await load();
  };

  const startEdit = (c) => {
    setEditing(c.id);
    setEditMax(c.max_uses ? String(c.max_uses) : '0');
  };

  const saveMax = async (c) => {
    setSavingMax(true);
    try {
      await insforgeCoupons.update(c.id, { max_uses: Math.max(0, Math.floor(Number(editMax) || 0)) });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e?.message || 'Could not update coupon.');
    } finally {
      setSavingMax(false);
    }
  };

  return (
    <div>
      {/* Create form */}
      <div className="p-6 rounded-3xl border border-border bg-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-lg">{campaignTarget ? `New discount code for ${campaignTarget.name}` : 'New coupon'}</h2>
        </div>
        {!canCreate && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
            Only super admins can create new coupons. Ask a super admin to create one for you.
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="SUMMER25"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo uppercase"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Discount type</label>
            <select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
            >
              <option value="percent">Percent (%)</option>
              <option value="fixed_amount">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Discount value</label>
            <input
              type="number"
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              placeholder={form.discount_type === 'percent' ? '25' : '5'}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max uses (0 = unlimited)</label>
            <input
              type="number"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              placeholder="100"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Expires (optional)</label>
            <input
              type="date"
              value={form.expires_date}
              onChange={(e) => setForm({ ...form, expires_date: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Summer promo"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        <button
          onClick={create}
          disabled={creating || !canCreate}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-xl hover:scale-[1.01] transition-transform olo-glow disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create coupon
        </button>
      </div>

      {/* Existing coupons */}
      <div>
        <h2 className="font-heading font-600 text-lg mb-3">All coupons ({coupons.length})</h2>
        {!loaded ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
        ) : error ? (
          <div className="p-8 rounded-3xl border border-dashed border-destructive/30 text-center text-destructive text-sm">{error}</div>
        ) : coupons.length === 0 ? (
          <div className="p-8 rounded-3xl border border-dashed border-border text-center text-muted-foreground text-sm">
            No coupons yet — create your first one above.
          </div>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card">
                <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-5 h-5 text-olo" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-700 text-sm">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.discount_type === 'percent' ? `${c.discount_value}% off` : `${c.discount_value} off`}
                    {c.max_uses ? ` · ${c.used_count || 0}/${c.max_uses} used` : ` · ${c.used_count || 0} used (unlimited)`}
                    {c.expires_date && ` · exp ${new Date(c.expires_date).toLocaleDateString()}`}
                  </p>
                  <CouponInfluencerAction coupon={c} campaign={campaigns[c.id]} canCreate={canCreate} onChanged={load} />
                  {editing === c.id ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={editMax}
                        onChange={(e) => setEditMax(e.target.value)}
                        className="w-24 px-2 py-1 rounded-lg border border-border bg-background text-xs focus:outline-none focus:border-olo"
                        placeholder="0 = unlimited"
                      />
                      <button onClick={() => saveMax(c)} disabled={savingMax} className="text-xs font-semibold text-olo hover:underline disabled:opacity-50">
                        {savingMax ? 'Saving…' : 'Save uses'}
                      </button>
                      <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => startEdit(c)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/5 transition-colors"
                  title="Edit max uses"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggle(c)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${c.active ? 'bg-olo/10 text-olo' : 'bg-muted text-muted-foreground'}`}
                  title={c.active ? 'Deactivate' : 'Activate'}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(c)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}