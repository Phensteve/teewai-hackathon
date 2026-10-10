import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import Logo from '@/components/Logo';

const SECTIONS = [
  {
    title: 'Product',
    links: [
      { to: '/', label: 'Home' },
      { to: '/hometest', label: 'Live demo' },
      { to: '/reference-material', label: 'Reference material guide' },
    ],
  },
  {
    title: 'App (sign in required)',
    links: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/scan', label: 'New teeth scan' },
      { to: '/braces-check', label: 'Braces check' },
      { to: '/my-scans', label: 'My scans' },
      { to: '/stain-tracker', label: 'Food & stain tracker' },
      { to: '/home-whitening', label: 'Home whitening methods' },
      { to: '/time-machine', label: 'Smile Time Machine' },
      { to: '/subscription', label: 'Subscription & plans' },
      { to: '/find-dentist', label: 'Find a dentist' },
      { to: '/leaderboard', label: 'Leaderboard' },
      { to: '/profile', label: 'Profile' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/help', label: 'Help center' },
      { to: '/support', label: 'Customer service' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/terms', label: 'Terms of service' },
      { to: '/privacy', label: 'Privacy policy' },
    ],
  },
];

export default function Sitemap() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border sticky top-0 z-50 backdrop-blur-xl bg-background/80 safe-area-inset-top">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-2">
          <Logo size={30} />
          <span className="font-heading font-700 tracking-tight text-lg">teewai</span>
          <span className="ml-auto text-xs uppercase tracking-wider text-muted-foreground">Sitemap</span>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="font-heading font-700 text-3xl sm:text-4xl tracking-tight mb-2">Sitemap</h1>
        <p className="text-sm text-muted-foreground mb-10">Every page on teewai, in one place.</p>
        <div className="grid sm:grid-cols-2 gap-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-heading font-600 text-sm uppercase tracking-wider text-olo mb-3">{s.title}</h2>
              <ul className="space-y-2">
                {s.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-olo transition-colors">
                      {l.label}
                      <ExternalLink className="w-3 h-3 text-muted-foreground/50" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}