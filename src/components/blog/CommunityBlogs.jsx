import { useState, useEffect } from 'react';
import { Calendar, Users, ChevronRight, X, BadgeCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { unrufld } from '@/api/unrufldClient';
import Spinner from '@/components/Spinner';

// Public "From the community" section for the Blog page. Renders approved
// user-submitted blog posts (BlogSubmission) as cards, with a reader modal.
// Authors who hold an approved BlogVerification show a verified badge.
const MD_COMPONENTS = {
  h1: ({ node, ...p }) => <h1 className="font-heading font-700 text-2xl mt-6 mb-2" {...p} />,
  h2: ({ node, ...p }) => <h2 className="font-heading font-700 text-xl mt-5 mb-2" {...p} />,
  h3: ({ node, ...p }) => <h3 className="font-heading font-600 text-lg mt-4 mb-2" {...p} />,
  p: ({ node, ...p }) => <p className="mb-3 leading-relaxed" {...p} />,
  ul: ({ node, ...p }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...p} />,
  ol: ({ node, ...p }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...p} />,
  a: ({ node, ...p }) => <a className="text-olo underline hover:no-underline" target="_blank" rel="noreferrer" {...p} />,
  code: ({ node, ...p }) => <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono" {...p} />,
  pre: ({ node, ...p }) => <pre className="p-3 rounded-xl bg-muted overflow-x-auto text-sm font-mono mb-3" {...p} />,
  blockquote: ({ node, ...p }) => <blockquote className="border-l-2 border-olo/40 pl-4 italic text-muted-foreground mb-3" {...p} />,
};

export default function CommunityBlogs() {
  const [posts, setPosts] = useState([]);
  const [verified, setVerified] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [subs, verifs] = await Promise.all([
          unrufld.entities.BlogSubmission.filter({ status: 'approved' }, '-created_date', 50).catch(() => []),
          unrufld.entities.BlogVerification.filter({ status: 'approved' }, '-created_date', 200).catch(() => []),
        ]);
        setPosts(Array.isArray(subs) ? subs : []);
        setVerified(new Set((verifs || []).map((v) => v.user_id).filter(Boolean)));
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!posts.length) return null;

  return (
    <section className="mt-14 sm:mt-20">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-700 text-2xl sm:text-3xl tracking-tight">From the community</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        {posts.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(p)}
            className="group text-left p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border bg-card hover:border-olo/40 hover:shadow-xl hover:shadow-olo/5 transition-all duration-300 hover:-translate-y-0.5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-olo">{p.category || 'Community'}</span>
            <h3 className="mt-2 font-heading font-600 text-lg sm:text-xl leading-snug">{p.title}</h3>
            {p.excerpt && <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">{p.excerpt}</p>}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {p.author_name || 'teewai user'}
                  {verified.has(p.author_id) && <BadgeCheck className="w-3.5 h-3.5 text-olo" />}
                </span>
                {p.submitted_date && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(p.submitted_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-olo group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-up overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-background sm:rounded-3xl min-h-screen sm:min-h-0 sm:max-h-[88vh] sm:overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-8 py-4 bg-background/95 backdrop-blur-xl border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-olo">{open.category || 'Community'}</span>
              <button onClick={() => setOpen(null)} className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors" aria-label="Close article"><X className="w-4 h-4" /></button>
            </div>
            <article className="px-5 sm:px-8 py-6 sm:py-10">
              <h1 className="font-heading font-700 text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance">{open.title}</h1>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {open.author_name || 'teewai user'}
                  {verified.has(open.author_id) && <BadgeCheck className="w-3.5 h-3.5 text-olo" />}
                </span>
                {open.submitted_date && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(open.submitted_date).toLocaleDateString()}</span>
                  </>
                )}
              </div>
              {open.excerpt && <p className="mt-4 text-base text-muted-foreground leading-relaxed">{open.excerpt}</p>}
              <div className="mt-6 text-[0.95rem] sm:text-base text-foreground/85 leading-relaxed">
                <ReactMarkdown components={MD_COMPONENTS}>{open.content || ''}</ReactMarkdown>
              </div>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}