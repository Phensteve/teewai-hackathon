import { useState, useEffect, useCallback } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import { Plus, Trash2, Pencil, Loader2, Power, Eye, X, GripVertical, BadgeCheck } from 'lucide-react';
import TipCard from '@/components/dashboard/TipCard';

// Admin management panel for dashboard tips. Full CRUD: create, edit, reorder
// (sort_order), activate/deactivate, delete. Live preview of how the tip card
// renders. Admin-only — the Tip entity RLS enforces admin writes; if the
// current Base44 user is not an admin, writes fail with a clear error.

const EMPTY = {
  title: '',
  teaser: '',
  body: '',
  category: 'info',
  chart_type: 'none',
  chart_label: '',
  illustration: 'none',
  sort_order: 0,
  active: true,
  audience: 'all',
  verified: false,
  confidence: 0,
  slug: '',
};

const CHART_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'plaque_buildup', label: 'Plaque buildup over time' },
  { value: 'brush_vs_stain', label: 'Brushing vs stain score' },
  { value: 'water_drymouth', label: 'Water intake vs dry mouth' },
  { value: 'sugar_timeline', label: 'Sugar exposure timeline' },
];

const ILLUSTRATIONS = [
  { value: 'none', label: 'None' },
  { value: 'tooth_yellow', label: 'Yellow tooth' },
  { value: 'tooth_violet', label: 'Violet film tooth' },
  { value: 'tooth_wipe', label: 'Wipe/scratch tooth' },
  { value: 'tooth_clean', label: 'Clean white tooth' },
  { value: 'tooth_stain', label: 'Stained tooth' },
  { value: 'tooth_brush', label: 'Brushing tooth' },
];

export default function TipsPanel() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // tip being edited or 'new'
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminAuth.listTips();
      setTips(data.tips || []);
    } catch (e) {
      setError(e?.message || 'Could not load tips.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startNew = () => {
    const nextOrder = tips.length > 0 ? Math.min(...tips.map((t) => t.sort_order ?? 0)) - 1 : 0;
    setForm({ ...EMPTY, sort_order: nextOrder });
    setEditing('new');
    setPreviewExpanded(true);
  };

  const startEdit = (tip) => {
    setForm({
      title: tip.title || '',
      teaser: tip.teaser || '',
      body: tip.body || '',
      category: tip.category || 'info',
      chart_type: tip.chart_type || 'none',
      chart_label: tip.chart_label || '',
      illustration: tip.illustration || 'none',
      sort_order: tip.sort_order ?? 0,
      active: tip.active ?? true,
      audience: tip.audience || 'all',
      verified: tip.verified ?? false,
      confidence: tip.confidence ?? 0,
      slug: tip.slug || '',
    });
    setEditing(tip.id);
    setPreviewExpanded(true);
  };

  const cancel = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const save = async () => {
    setError('');
    if (!form.title.trim() || !form.teaser.trim()) {
      setError('Title and teaser are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        teaser: form.teaser.trim(),
        body: form.body.trim(),
        category: form.category,
        chart_type: form.chart_type,
        chart_label: form.chart_type !== 'none' ? form.chart_label.trim() : '',
        illustration: form.illustration,
        sort_order: Number(form.sort_order) || 0,
        active: !!form.active,
        audience: form.audience,
        verified: !!form.verified,
        confidence: Number(form.confidence) || 0,
        slug: form.slug.trim(),
      };
      if (editing === 'new') {
        await adminAuth.saveTip(payload);
      } else {
        await adminAuth.saveTip({ tip_id: editing, ...payload });
      }
      setEditing(null);
      setForm(EMPTY);
      await load();
    } catch (e) {
      setError(e?.message || 'Could not save tip. Admin Base44 session required.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tip) => {
    try {
      await adminAuth.saveTip({ tip_id: tip.id, active: !tip.active });
      await load();
    } catch (e) {
      setError(e?.message || 'Could not update tip.');
    }
  };

  const toggleVerified = async (tip) => {
    try {
      await adminAuth.saveTip({ tip_id: tip.id, verified: !tip.verified });
      await load();
    } catch (e) {
      setError(e?.message || 'Could not update tip.');
    }
  };

  const remove = async (tip) => {
    if (!confirm(`Delete "${tip.title}"? This cannot be undone.`)) return;
    try {
      await adminAuth.deleteTip(tip.id);
      await load();
    } catch (e) {
      setError(e?.message || 'Could not delete tip.');
    }
  };

  const move = async (tip, dir) => {
    const idx = tips.findIndex((t) => t.id === tip.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tips.length) return;
    const swap = tips[swapIdx];
    try {
      await Promise.all([
        adminAuth.saveTip({ tip_id: tip.id, sort_order: swap.sort_order }),
        adminAuth.saveTip({ tip_id: swap.id, sort_order: tip.sort_order }),
      ]);
      await load();
    } catch (e) {
      setError(e?.message || 'Could not reorder tip.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-700 text-lg">Dashboard Tips</h2>
          <p className="text-sm text-muted-foreground">Create, edit, reorder, and toggle the tip cards shown on the dashboard.</p>
          <p className="text-xs text-muted-foreground mt-1">
            {tips.length} tips · {tips.filter((t) => t.verified).length} verified ({tips.length ? Math.round((tips.filter((t) => t.verified).length / tips.length) * 100) : 0}%)
          </p>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 bg-olo text-white text-sm font-semibold px-4 py-2 rounded-xl hover:scale-[1.02] transition-transform"
        >
          <Plus className="w-4 h-4" /> New tip
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-olo animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {tips.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No tips yet. Create one to get started.</p>
          )}
          {tips.map((tip, idx) => (
            <div key={tip.id} className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
              <div className="flex flex-col">
                <button onClick={() => move(tip, 'up')} disabled={idx === 0} className="text-muted-foreground hover:text-olo disabled:opacity-30">
                  <GripVertical className="w-4 h-4 rotate-180" />
                </button>
                <button onClick={() => move(tip, 'down')} disabled={idx === tips.length - 1} className="text-muted-foreground hover:text-olo disabled:opacity-30 -mt-1">
                  <GripVertical className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-600 truncate">{tip.title}</p>
                <p className="text-xs text-muted-foreground truncate">{tip.teaser}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{tip.category}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${tip.verified ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`} title="Research confidence">
                {tip.verified ? 'Verified' : 'Unverified'}{tip.confidence ? ` · ${tip.confidence}%` : ''}
              </span>
              <button onClick={() => toggleVerified(tip)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title={tip.verified ? 'Mark unverified' : 'Mark verified'}>
                <BadgeCheck className={`w-4 h-4 ${tip.verified ? 'text-success' : 'text-muted-foreground'}`} />
              </button>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${tip.active ? 'bg-olo/15 text-olo' : 'bg-muted text-muted-foreground'}`}>
                {tip.active ? 'Active' : 'Hidden'}
              </span>
              <button onClick={() => toggleActive(tip)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title={tip.active ? 'Deactivate' : 'Activate'}>
                <Power className={`w-4 h-4 ${tip.active ? 'text-olo' : 'text-muted-foreground'}`} />
              </button>
              <button onClick={() => startEdit(tip)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Edit">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => remove(tip)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={cancel}>
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-3xl bg-card border border-border shadow-2xl animate-modal-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={cancel} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-heading font-700 text-lg mb-4 pr-8">{editing === 'new' ? 'New tip' : 'Edit tip'}</h3>

            <div className="space-y-3">
              <Field label="Title">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              </Field>
              <Field label="Teaser (shown when collapsed)">
                <input value={form.teaser} onChange={(e) => setForm({ ...form, teaser: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              </Field>
              <Field label="Body (shown when expanded)">
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-y" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm">
                    <option value="info">Info</option>
                    <option value="lifestyle">Lifestyle</option>
                  </select>
                </Field>
                <Field label="Audience">
                  <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm">
                    <option value="all">All</option>
                    <option value="patient">Patient</option>
                    <option value="dentist">Dentist</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Chart type">
                  <select value={form.chart_type} onChange={(e) => setForm({ ...form, chart_type: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm">
                    {CHART_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Illustration">
                  <select value={form.illustration} onChange={(e) => setForm({ ...form, illustration: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm">
                    {ILLUSTRATIONS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </Field>
              </div>
              {form.chart_type !== 'none' && (
                <Field label="Chart accessible label (aria-label)">
                  <input value={form.chart_label} onChange={(e) => setForm({ ...form, chart_label: e.target.value })} placeholder="e.g. Plaque coverage increasing over 7 days without brushing" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort order (lower = first)">
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                </Field>
                <Field label="Active">
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-olo" />
                    <span className="text-sm">Show on dashboard</span>
                  </label>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Verified">
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} className="w-4 h-4 accent-success" />
                    <span className="text-sm">Mark as verified</span>
                  </label>
                </Field>
                <Field label="Research confidence (%)">
                  <input type="number" min="0" max="100" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                </Field>
              </div>
            </div>

            {/* Live preview */}
            <div className="mt-4">
              <p className="text-xs font-heading font-600 text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live preview
              </p>
              <TipCard
                tip={{ ...form, id: 'preview' }}
                expanded={previewExpanded}
                onToggle={() => setPreviewExpanded((p) => !p)}
              />
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-olo text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editing === 'new' ? 'Create tip' : 'Save changes'}
              </button>
              <button onClick={cancel} className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2.5">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}