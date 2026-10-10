import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronRight, CheckCircle2, Rocket } from 'lucide-react';
import Logo from '@/components/Logo';
import BackButton from '@/components/BackButton';
import ThemeToggle from '@/components/ThemeToggle';
import { NEWS_UPDATES, TAG_STYLES, formatDate } from '@/lib/newsUpdates';
import useDocumentMeta from '@/hooks/use-document-meta';

// News & Updates — a product changelog presented as a vertical timeline.
// Deliberately distinct from the Blog (which is a featured card + grid that
// opens articles in a modal): here every update sits on a left connector
// rail with a version pill, and expands inline (accordion) rather than in a
// modal. Same premium, clean chrome as the Blog so the two pages feel like
// sisters, but the reading rhythm is unmistakably a changelog.

export default function NewsUpdates() {
  const [openIdx, setOpenIdx] = useState(0);

  useDocumentMeta({
    title: 'News & Updates',
    description: "A running log of every landmark teewai ships — new features, improvements, and milestones, newest first.",
    path: '/news',
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Simple public header — matches Blog */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-xl safe-area-inset-top">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={30} className="olo-glow" />
            <span className="font-heading font-700 text-lg tracking-tight">teewai</span>
            <span className="ml-2 text-xs font-medium text-muted-foreground hidden sm:inline">News</span>
          </Link>
          <div className="flex items-center gap-2">
            <BackButton compact label="Back" className="font-medium" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        {/* Heading */}
        <div className="mb-10 sm:mb-14">
          <span className="text-olo font-semibold text-xs sm:text-sm uppercase tracking-widest">Changelog</span>
          <h1 className="mt-3 font-heading font-700 text-3xl sm:text-4xl md:text-5xl tracking-tight text-balance">
            What's new in teewai
          </h1>
          <p className="mt-4 text-sm sm:text-lg text-muted-foreground max-w-2xl text-balance">
            A running log of every landmark we ship — new features, improvements, and milestones, newest first. teewai officially launched on July 26, 2026.
          </p>
        </div>

        {/* Vertical timeline */}
        <div className="relative">
          {/* Connector rail */}
          <div className="absolute left-[15px] sm:left-[19px] top-2 bottom-2 w-px bg-border" aria-hidden />

          <ol className="space-y-3">
            {NEWS_UPDATES.map((u, i) => {
              const tag = TAG_STYLES[u.tag] || TAG_STYLES.feature;
              const open = openIdx === i;
              const isLaunch = u.tag === 'launch' && u.version === '1.0.0';
              return (
                <li key={u.title} className="relative pl-10 sm:pl-14">
                  {/* Timeline dot */}
                  <span
                    className={`absolute left-0 top-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 bg-card ${
                      isLaunch ? 'border-olo bg-olo/10' : 'border-border bg-card'
                    }`}
                  >
                    {isLaunch ? <Rocket className="w-4 h-4 text-olo" /> : <span className={`w-2 h-2 rounded-full ${open ? 'bg-olo' : 'bg-muted-foreground/40'}`} />}
                  </span>

                  <button
                    onClick={() => setOpenIdx(open ? -1 : i)}
                    className={`w-full text-left p-5 sm:p-6 rounded-2xl border transition-all duration-300 ${
                      open
                        ? 'border-olo/40 bg-card shadow-lg shadow-olo/5'
                        : 'border-border bg-card hover:border-olo/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${tag.cls}`}>{tag.label}</span>
                      {u.version && (
                        <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">v{u.version}</span>
                      )}
                      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 ml-auto">
                        <Calendar className="w-3 h-3" /> {formatDate(u.date)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-heading font-700 text-lg sm:text-xl leading-snug text-balance">{u.title}</h2>
                      <span className={`flex-shrink-0 mt-1 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{u.summary}</p>

                    {open && u.changes.length > 0 && (
                      <ul className="mt-4 space-y-2.5 border-t border-border pt-4">
                        {u.changes.map((c, j) => (
                          <li key={j} className="flex items-start gap-2.5 text-sm text-foreground/85">
                            <CheckCircle2 className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{c}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* CTA strip */}
        <div className="mt-10 p-5 rounded-2xl bg-olo/5 border border-olo/20 flex items-center gap-3">
          <Rocket className="w-5 h-5 text-olo flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Join the conversation — <Link to="/community" className="text-olo font-medium underline hover:no-underline">visit the Common Room</Link>.
          </p>
        </div>
      </main>

      {/* Footer — matches Blog */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>© 2026 teewai. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/blog" className="hover:text-olo transition-colors">Blog</Link>
            <Link to="/community" className="hover:text-olo transition-colors">Community</Link>
            <Link to="/privacy" className="hover:text-olo transition-colors">Privacy</Link>
            <Link to="/help" className="hover:text-olo transition-colors">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}