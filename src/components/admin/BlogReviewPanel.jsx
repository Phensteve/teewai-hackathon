import { useState, useEffect } from 'react';
import { Newspaper, Loader2, Check, X, BadgeCheck, PenLine, RotateCcw } from 'lucide-react';
import { adminAuth } from '@/lib/adminAuth';
import { useToast } from '@/components/ui/use-toast';

// Admin panel for reviewing (a) user-submitted blog posts and (b) blog-author
// verification applications. Gated to content_admin + super_admin by the
// backend (review_blogs privilege). Super admins can additionally override a
// previous decline (re-approve a rejected item).
export default function BlogReviewPanel({ callerRole }) {
  const [sub, setSub] = useState('posts');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Newspaper className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-700 text-xl">Blog moderation</h2>
      </div>
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1 w-full sm:w-auto sm:inline-flex">
        <button onClick={() => setSub('posts')} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all ${sub === 'posts' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Blog posts</button>
        <button onClick={() => setSub('bloggers')} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all ${sub === 'bloggers' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Bloggers</button>
      </div>
      {sub === 'posts' ? <PostsTab callerRole={callerRole} /> : <BloggersTab callerRole={callerRole} />}
    </div>
  );
}

function PostsTab({ callerRole }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [open, setOpen] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminAuth.listBlogSubmissions();
      setItems(data?.submissions || []);
    } catch (e) { toast({ title: 'Load failed', description: e?.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const review = async (id, status, notes) => {
    setBusy(id);
    try {
      await adminAuth.reviewBlogSubmission(id, status, notes || '');
      toast({ title: status === 'approved' ? 'Blog approved' : 'Blog declined' });
      load();
    } catch (e) { toast({ title: 'Action failed', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-olo animate-spin" /></div>;
  if (!items.length) return <p className="text-sm text-muted-foreground p-6 rounded-2xl border border-dashed border-border text-center">No blog submissions.</p>;

  return (
    <div className="space-y-3">
      {items.map((p) => (
        <div key={p.id} className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-heading font-600 text-sm flex items-center gap-2 flex-wrap">
                {p.title}
                <span className="text-[10px] font-bold text-olo bg-olo/10 px-2 py-0.5 rounded-full uppercase">{p.category || 'Community'}</span>
                {p.status === 'approved' && <BadgeCheck className="w-4 h-4 text-success" />}
                {p.status === 'pending' && <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full uppercase">Pending</span>}
                {p.status === 'rejected' && <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full uppercase">Declined</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">by {p.author_name || 'user'}{p.author_username ? ` (@${p.author_username})` : ''} · {p.submitted_date ? new Date(p.submitted_date).toLocaleDateString() : ''}</p>
              {p.excerpt && <p className="text-xs text-muted-foreground mt-1">{p.excerpt}</p>}
              {p.review_notes && <p className="text-xs text-muted-foreground mt-1">Notes: {p.review_notes}</p>}
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={() => setOpen(p)} className="text-xs font-medium text-olo hover:underline">Read</button>
              {p.status !== 'approved' && (
                <button onClick={() => review(p.id, 'approved')} disabled={busy === p.id} className="inline-flex items-center gap-1.5 bg-success text-success-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                  {busy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                </button>
              )}
              {p.status === 'pending' && (
                <button onClick={() => review(p.id, 'rejected', 'Does not meet publishing criteria')} disabled={busy === p.id} className="inline-flex items-center gap-1.5 border border-destructive/40 text-destructive text-xs font-semibold px-3 py-2 rounded-lg hover:bg-destructive/10 disabled:opacity-50">
                  <X className="w-3.5 h-3.5" /> Decline
                </button>
              )}
              {p.status === 'rejected' && callerRole === 'super_admin' && (
                <button onClick={() => review(p.id, 'approved')} disabled={busy === p.id} className="inline-flex items-center gap-1.5 border border-olo/40 text-olo text-xs font-semibold px-3 py-2 rounded-lg hover:bg-olo/5 disabled:opacity-50">
                  <RotateCcw className="w-3.5 h-3.5" /> Override
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-background sm:rounded-3xl min-h-screen sm:min-h-0 sm:max-h-[88vh] sm:overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-8 py-4 bg-background/95 backdrop-blur-xl border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-olo">{open.category || 'Community'}</span>
              <button onClick={() => setOpen(null)} className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <article className="px-5 sm:px-8 py-6 sm:py-10">
              <h1 className="font-heading font-700 text-2xl sm:text-3xl tracking-tight">{open.title}</h1>
              <p className="text-xs text-muted-foreground mt-2">by {open.author_name || 'user'} · {open.submitted_date ? new Date(open.submitted_date).toLocaleDateString() : ''}</p>
              {open.excerpt && <p className="mt-4 text-base text-muted-foreground">{open.excerpt}</p>}
              <pre className="mt-6 whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground/85 bg-muted/40 p-4 rounded-2xl">{open.content}</pre>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}

function BloggersTab({ callerRole }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminAuth.listBlogVerifications();
      setItems(data?.verifications || []);
    } catch (e) { toast({ title: 'Load failed', description: e?.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const review = async (id, status, notes) => {
    setBusy(id);
    try {
      await adminAuth.reviewBlogVerification(id, status, notes || '');
      toast({ title: status === 'approved' ? 'Blogger approved' : 'Application declined' });
      load();
    } catch (e) { toast({ title: 'Action failed', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-olo animate-spin" /></div>;
  if (!items.length) return <p className="text-sm text-muted-foreground p-6 rounded-2xl border border-dashed border-border text-center">No blogger applications.</p>;

  return (
    <div className="space-y-3">
      {items.map((v) => (
        <div key={v.id} className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-heading font-600 text-sm flex items-center gap-2 flex-wrap">
                <PenLine className="w-4 h-4 text-olo" /> {v.full_name}
                {v.status === 'approved' && <BadgeCheck className="w-4 h-4 text-success" />}
                {v.status === 'pending' && <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full uppercase">Pending</span>}
                {v.status === 'rejected' && <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full uppercase">Declined</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{v.email}</p>
              {v.bio && <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{v.bio}</p>}
              {v.sample_url && <a href={v.sample_url} target="_blank" rel="noreferrer" className="text-xs text-olo hover:underline mt-1 inline-block">View sample →</a>}
              {v.review_notes && <p className="text-xs text-muted-foreground mt-1">Notes: {v.review_notes}</p>}
            </div>
            <div className="flex gap-2">
              {v.status !== 'approved' && (
                <button onClick={() => review(v.id, 'approved')} disabled={busy === v.id} className="inline-flex items-center gap-1.5 bg-success text-success-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                  {busy === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                </button>
              )}
              {v.status === 'pending' && (
                <button onClick={() => review(v.id, 'rejected', 'Does not meet blogger criteria')} disabled={busy === v.id} className="inline-flex items-center gap-1.5 border border-destructive/40 text-destructive text-xs font-semibold px-3 py-2 rounded-lg hover:bg-destructive/10 disabled:opacity-50">
                  <X className="w-3.5 h-3.5" /> Decline
                </button>
              )}
              {v.status === 'rejected' && callerRole === 'super_admin' && (
                <button onClick={() => review(v.id, 'approved')} disabled={busy === v.id} className="inline-flex items-center gap-1.5 border border-olo/40 text-olo text-xs font-semibold px-3 py-2 rounded-lg hover:bg-olo/5 disabled:opacity-50">
                  <RotateCcw className="w-3.5 h-3.5" /> Override
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}