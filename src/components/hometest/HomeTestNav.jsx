import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Logo from '@/components/Logo';
import SmartCTA from './SmartCTA';

export default function HomeTestNav() {
  const links = [
    { href: '#how', label: 'How it works' },
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Not your doctor disclaimer */}
      <div className="bg-amber-500/15 backdrop-blur-xl border-b border-amber-500/25 text-amber-400 text-center px-4 py-1.5 text-[11px] font-medium">
        <span className="inline-flex items-center gap-1.5 text-amber-400">
          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
          teewai is a wellness companion — not a medical device. We strongly advise you to visit your dentist.
        </span>
      </div>
      <nav style={{ backdropFilter: 'blur(20px)', background: 'rgba(6,18,26,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3.5 gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-heading font-700 tracking-tight text-base text-white">teewai</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[11px] uppercase tracking-[0.12em] font-medium text-white/50 hover:text-white transition-colors">{l.label}</a>
          ))}
        </div>
        <SmartCTA loggedInTo="/dashboard" loggedOutTo="/register" className="text-[11px] font-semibold uppercase tracking-wider bg-[#0d9f8e] text-white px-4 py-2 rounded-lg hover:bg-[#16c2a6] transition-colors whitespace-nowrap">Get started</SmartCTA>
      </div>
      </nav>
    </header>
  );
}