import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Save, Loader2, FileText, Trash2, Send, PenLine } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { useToast } from '@/components/ui/use-toast';
import Spinner from '@/components/Spinner';

const CATEGORIES = ['Whitening', 'Stain science', 'Dental health', 'My story', 'Tips', 'Community', 'Research'];

function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// Auth-gated page where signed-in users write blog submissions for review.
// A submission starts as "pending"; a content admin approves/declines it.
// Approved posts surface on the public Blog page under "From the community".
export default function BlogWrite() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', excerpt: '', category: CATEGORIES[0], content: '', cover_image_url: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await unrufld.auth.me();
        setUser(u);
        const list = await unrufld.entities.BlogSubmission.filter({ author_id: u.id }, '-created_date', 50).catch(() => []);
        setMine(Array.isArray(list) ? list : []);
      } catch { /* handled by route guard */ }
      finally { setLoading(false); }
    })();
  }, []);

  const reset = () => { setEditing(null); setForm({ title: '', excerpt: '', category: CATEGORIES[0], content: '', cover_image_url: '' }); };

  const onCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await unrufld.integrations.Core.UploadPublicFile({ file });
      setForm((f) => ({ ...f, cover_image_url: file_url }));
      toast({ title: 'Cover uploaded' });
    } catch { toast({ title: 'Upload failed', variant: 'destructive' }); }
    finally { setUploading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: slugify(form.title),
        excerpt: form.excerpt.trim() || undefined,
        content: form.content.trim(),
        category: form.category,
        cover_image_url: form.cover_image_url || undefined,
        author_id: user.id,
        author_name: user.display_name || user.username || user.full_name || 'teewai user',
        author_username: user.username || null,
        status: 'pending',
        submitted_date: new Date().toISOString(),
      };
      const created = await unrufld.entities.BlogSubmission.create(payload);
      setMine((m) => [created, ...m]);
      reset();
      toast({ title: 'Submitted for review', description: 'A teewai content admin will review your post.' });
    } catch (err) { toast({ title: 'Could not submit', description: err?.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await unrufld.entities.BlogSubmission.update(editing.id, {
        title: form.title.trim(),
        slug: slugify(form.title),
        excerpt: form.excerpt.trim() || undefined,
        content: form.content.trim(),
        category: form.category,
        cover_image_url: form.cover_image_url || undefined,
        status: 'pending',
        review_notes: '',
        submitted_date: new Date().toISOString(),
      });
      setMine((m) => m.map((x) => x.id === editing.id ? updated : x));
      reset();
      toast({ title: 'Updated & resubmitted' });
    } catch (err) { toast({ title: 'Could not update', description: err?.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    try { await unrufld.entities.BlogSubmission.delete(id); setMine((m) => m.filter((x) => x.id !== id)); }
    catch { toast({ title: 'Could not delete', variant: 'destructive' }); }
  };

  const loadEdit = (p) => {
    setEditing(p);
    setForm({ title: p.title || '', excerpt: p.excerpt || '', category: p.category || CATEGORIES[0], content: p.content || '', cover_image_url: p.cover_image_url || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div className="flex justify-center min-h-[60vh]"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5">
        <ArrowRight className="w-4 h-4 rotate-180" /> Back to profile
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center"><PenLine className="w-6 h-6 text-olo" /></div>
        <div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">Write a blog</h1>
          <p className="text-sm text-muted-foreground">Share your smile story or research. Submissions are reviewed by a teewai content admin before publishing.</p>
        </div>
      </div>

      <form onSubmit={submit} className="p-5 rounded-3xl border border-border bg-card space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-base focus:outline-none focus:border-olo" placeholder="A catchy title" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Cover image</label>
            <label className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium hover:border-olo/40 cursor-pointer transition-colors">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} {form.cover_image_url ? 'Replace' : 'Upload'}
              <input type="file" accept="image/*" onChange={onCover} className="hidden" />
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Excerpt (optional)</label>
          <input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="mt-2 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo" placeholder="A short summary shown on the card" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Content (Markdown)</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={12}
            className="mt-2 w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-mono leading-relaxed focus:outline-none focus:border-olo resize-y"
            placeholder={"# Heading\nWrite your story in Markdown — **bold**, lists, links, etc."}
          />
          <p className="text-xs text-muted-foreground mt-1">Supports Markdown: # headings, **bold**, lists, links, etc.</p>
        </div>
        <div className="flex justify-end gap-2">
          {editing && <button type="button" onClick={reset} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>}
          <button type="button" onClick={editing ? saveEdit : submit} disabled={saving || !form.title.trim() || !form.content.trim()} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {editing ? 'Save & resubmit' : 'Submit for review'}
          </button>
        </div>
      </form>

      <h2 className="font-heading font-600 text-lg mt-8 mb-3">Your submissions</h2>
      {mine.length === 0 ? (
        <p className="text-sm text-muted-foreground p-5 rounded-2xl border border-dashed border-border text-center">You haven't submitted any blogs yet.</p>
      ) : (
        <div className="space-y-2.5">
          {mine.map((p) => (
            <div key={p.id} className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading font-600 text-sm truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.category} · {p.submitted_date ? new Date(p.submitted_date).toLocaleDateString() : ''}</p>
                  {p.review_notes && <p className="text-xs text-muted-foreground mt-1">Notes: {p.review_notes}</p>}
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${p.status === 'approved' ? 'text-success bg-success/10' : p.status === 'rejected' ? 'text-destructive bg-destructive/10' : 'text-warning bg-warning/10'}`}>{p.status}</span>
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={() => loadEdit(p)} className="text-xs font-medium text-olo hover:underline">Edit / resubmit</button>
                <button onClick={() => remove(p.id)} className="text-xs font-medium text-muted-foreground hover:text-destructive inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}