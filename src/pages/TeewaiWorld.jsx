import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Newspaper, Megaphone, LifeBuoy, MessageCircle, Globe } from 'lucide-react';
import Logo from '@/components/Logo';
import BackButton from '@/components/BackButton';
import useDocumentMeta from '@/hooks/use-document-meta';
import { openExternal } from '@/lib/openExternal';

// Teewai World — a professional hub that links to teewai's content & support
// destinations: Blog, News, Customer Service, and Community. One entry point
// from the hamburger menu keeps the menu clean while surfacing everything.
const DESTINATIONS = [
  {
    to: '/blog',
    icon: Newspaper,
    label: 'Blog',
    desc: 'Deep dives on whitening science, dental health, and the stories behind teewai.',
    accent: 'from-olo/15 to-olo/5',
  },
  {
    to: '/news',
    icon: Megaphone,
    label: 'News & Updates',
    desc: 'Product releases, milestones, and everything new in the teewai world.',
    accent: 'from-cyan-400/15 to-cyan-400/5',
  },
  {
    to: '/support',
    icon: LifeBuoy,
    label: 'Customer Service',
    desc: 'Get help, browse the help center, or reach the teewai team directly.',
    accent: 'from-emerald-400/15 to-emerald-400/5',
  },
  {
    to: '/community',
    icon: MessageCircle,
    label: 'Community',
    desc: 'Join the conversation — share progress, ask questions, and connect.',
    accent: 'from-violet-400/15 to-violet-400/5',
  },
];

export default function TeewaiWorld() {
  const navigate = useNavigate();
  useDocumentMeta({
    title: 'teewai world',
    description: "Your one gateway to teewai's stories, updates, support, and community — blog, news, customer service, and the community rooms.",
    path: '/teewai-world',
  });

  const openDestination = (to) => {
    if (openExternal(to)) return;
    navigate(to);
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border safe-area-inset-top">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <BackButton compact label="Back" />
          <div className="flex items-center gap-2">
            <Logo size={22} className="olo-glow" />
            <span className="font-heading font-700 text-sm tracking-tight">teewai</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-olo/10 text-olo text-xs font-medium mb-5">
            <Globe className="w-3 h-3" /> Welcome to
          </div>
          <h1 className="font-heading font-800 text-4xl sm:text-5xl tracking-tight mb-3">
            teewai <span className="text-olo olo-text-glow">world</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto text-balance">
            Your one gateway to teewai's stories, updates, support, and community. Pick a destination below.
          </p>
        </div>

        {/* Destination cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DESTINATIONS.map(({ to, icon: Icon, label, desc, accent }) => (
            <Link
              key={to}
              to={to}
              onClick={(e) => { e.preventDefault(); openDestination(to); }}
              className="group relative p-6 rounded-3xl border border-border bg-card frost-edge hover:border-olo/40 transition-all hover:-translate-y-0.5"
            >
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${accent} opacity-60 pointer-events-none`} />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-olo/10 flex items-center justify-center mb-4 group-hover:bg-olo/20 transition-colors">
                  <Icon className="w-6 h-6 text-olo" />
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <h2 className="font-heading font-700 text-lg">{label}</h2>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-olo transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground/70 font-serif tracking-wide">
          designed by oluyo
        </p>
      </main>
    </div>
  );
}