import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Star, MessageSquare, ChevronRight, X } from 'lucide-react';
import Logo from '@/components/Logo';
import BackButton from '@/components/BackButton';
import ThemeToggle from '@/components/ThemeToggle';
import { ARTICLES } from '@/lib/blogArticles';
import { SectionRenderer } from '@/components/blog/ArticleBlocks';
import CommunityBlogs from '@/components/blog/CommunityBlogs';
import useDocumentMeta from '@/hooks/use-document-meta';
import { openExternal } from '@/lib/openExternal';

// The teewai blog — research-grounded articles on dental whitening, shade
// science and the AI behind teewai. Each article carries a publication month
// + year, a realistic cover image and an ordered list of rich sections
// (prose, tables, charts, shade swatches, conference callouts) rendered by
// ArticleBlocks.

export default function Blog() {
  const [openSlug, setOpenSlug] = useState(null);
  const open = ARTICLES.find((a) => a.slug === openSlug);
  // In the native/APK build, blog articles open in the external browser.
  const openArticle = (slug) => {
    if (openExternal('/blog')) return;
    setOpenSlug(slug);
  };
  // Feature the food-scan article (the flagship feature) so it's the first
  // thing readers see, and pin the head-to-head comparison right under it.
  const featured = ARTICLES.find((a) => a.slug === 'food-scan-stain-tracking') || ARTICLES[0];
  const comparison = ARTICLES.find((a) => a.slug === 'teewai-vs-dental-ai-apps');
  const rest = ARTICLES.filter((a) => a.slug !== featured.slug && a.slug !== 'teewai-vs-dental-ai-apps');
  const ordered = [featured, comparison, ...rest].filter(Boolean);

  useDocumentMeta({
    title: 'Blog',
    description: 'Research-grounded articles on tooth shade, whitening chemistry, staining and the AI behind teewai — written so you can make better decisions for your smile.',
    path: '/blog',
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Simple public header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-xl safe-area-inset-top">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={30} className="olo-glow" />
            <span className="font-heading font-700 text-lg tracking-tight">teewai</span>
            <span className="ml-2 text-xs font-medium text-muted-foreground hidden sm:inline">Blog</span>
          </Link>
          <div className="flex items-center gap-2">
            <BackButton compact label="Back" className="font-medium" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16">
        {/* Heading */}
        <div className="mb-10 sm:mb-14">
          <span className="text-olo font-semibold text-xs sm:text-sm uppercase tracking-widest">The teewai blog</span>
          <h1 className="mt-3 font-heading font-700 text-3xl sm:text-4xl md:text-5xl tracking-tight text-balance">
            The science of a brighter smile
          </h1>
          <p className="mt-4 text-sm sm:text-lg text-muted-foreground max-w-2xl text-balance">
            Research-grounded articles on tooth shade, whitening chemistry, staining and the AI behind teewai — written so you can make better decisions for your smile.
          </p>
        </div>

        {/* Featured = food scan article */}
        <button
          onClick={() => openArticle(ordered[0].slug)}
          className="group text-left w-full mb-8 sm:mb-12 rounded-3xl border border-olo/30 overflow-hidden relative hover:scale-[1.01] transition-transform"
        >
          {ordered[0].cover ? (
            <>
              <img src={ordered[0].cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-olo-deep via-olo-deep/85 to-olo-deep/30" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-olo-deep to-[#062a30]" />
          )}
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-olo/25 rounded-full blur-[80px]" />
          <div className="relative z-10 p-6 sm:p-8 text-white">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-olo-glow bg-white/10 px-3 py-1 rounded-full">
              <Star className="w-3 h-3" /> Featured
            </span>
            <h2 className="mt-4 font-heading font-700 text-2xl sm:text-3xl tracking-tight">{ordered[0].title}</h2>
            <p className="mt-3 text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">{ordered[0].excerpt}</p>
            <div className="mt-5 flex items-center gap-3 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {ordered[0].date}</span>
              <span>·</span>
              <span>{ordered[0].readMins} min read</span>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-olo-glow group-hover:gap-2.5 transition-all">
              Read article <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </button>

        {/* Article grid */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {ordered.slice(1).map((a) => (
            <button
              key={a.slug}
              onClick={() => openArticle(a.slug)}
              className="group text-left rounded-2xl sm:rounded-3xl border border-border bg-card overflow-hidden hover:border-olo/40 hover:shadow-xl hover:shadow-olo/5 transition-all duration-300 hover:-translate-y-0.5 flex flex-col"
            >
              {a.cover && (
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  <img src={a.cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-5 sm:p-6 flex-1 flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-olo">{a.tag}</span>
                <h3 className="mt-2 font-heading font-600 text-lg sm:text-xl leading-snug">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">{a.excerpt}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" /> {a.date} · {a.readMins} min
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-olo group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </button>
          ))}
        </div>

        <CommunityBlogs />
      </main>

      {/* Article modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-up overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-background sm:rounded-3xl min-h-screen sm:min-h-0 sm:max-h-[88vh] sm:overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-8 py-4 bg-background/95 backdrop-blur-xl border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-olo">{open.tag}</span>
              <button
                onClick={() => setOpenSlug(null)}
                className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
                aria-label="Close article"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <article className="px-5 sm:px-8 py-6 sm:py-10">
              {open.cover && (
                <img src={open.cover} alt="" className="w-full aspect-[16/9] object-cover rounded-2xl mb-6" />
              )}
              <h1 className="font-heading font-700 text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance">{open.title}</h1>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {open.date}</span>
                <span>·</span>
                <span>{open.readMins} min read</span>
              </div>
              <div className="mt-6 space-y-5 text-[0.95rem] sm:text-base text-foreground/85 leading-relaxed">
                {open.sections.map((section, i) => (
                  <SectionRenderer key={i} section={section} />
                ))}
              </div>
              <div className="mt-8 p-4 rounded-2xl bg-olo/5 border border-olo/20 flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-olo flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  See where you sit on the VITA scale — <Link to="/register" className="text-olo font-medium underline hover:no-underline">scan your smile with teewai</Link>.
                </p>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>© 2026 teewai. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-olo transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-olo transition-colors">Terms</Link>
            <Link to="/help" className="hover:text-olo transition-colors">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}