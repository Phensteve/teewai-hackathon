import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Stethoscope, ShieldAlert } from 'lucide-react';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import TextZoomControl from '@/components/TextZoomControl';

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Not your doctor disclaimer */}
      <div className="bg-warning/15 backdrop-blur-xl border-b border-warning/20 text-warning text-center px-4 py-1.5 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5">
        <ShieldAlert className="w-3 h-3 flex-shrink-0" />
        teewai is a wellness companion, not a medical device. We strongly advise you to visit your dentist.
        </span>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
        <nav className="glass-light dark:glass rounded-2xl px-4 sm:px-5 py-3 flex items-center justify-between shadow-sm">
          <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <Logo size={32} className="olo-glow" />
            <span className="font-heading font-700 text-lg tracking-tight">teewai</span>
          </Link>

          {/* Powered by AI badge — desktop only */}
          <div className="hidden lg:flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full bg-olo/15 text-olo-deep dark:text-olo text-xs font-medium">
            <Stethoscope className="w-3 h-3" aria-hidden="true" />
            <span>Dental analysis</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/70">
            <a href="#how" className="hover:text-olo transition-colors">How it works</a>
            <a href="#features" className="hover:text-olo transition-colors">Features</a>
            <Link to="/pricing" className="hover:text-olo transition-colors">Pricing</Link>
            <Link to="/blog" className="hover:text-olo transition-colors">Blog</Link>
            <Link to="/news" className="hover:text-olo transition-colors">News</Link>
            <Link to="/community" className="hover:text-olo transition-colors">Community</Link>
          </div>

          <div className="flex items-center gap-2">
            <TextZoomControl showLabel />
            <ThemeToggle />
            <Link
              to="/free-scan"
              className="hidden sm:inline-flex items-center gap-1.5 border border-olo/40 text-olo hover:bg-olo/10 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            >
              Free scan
            </Link>
            <Link
              to="/register"
              className="hidden sm:inline-flex bg-olo hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:scale-105 olo-glow"
            >
              Get started
            </Link>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setOpen(o => !o)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/10 transition-colors"
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile dropdown — unfolds like paper */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{ transformOrigin: 'top' }}
              className="md:hidden mt-2 glass-light dark:glass rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="px-5 py-4 flex flex-col gap-3">
                <a href="#how" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground/70 hover:text-olo transition-colors py-2 border-b border-border">How it works</a>
                <a href="#features" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground/70 hover:text-olo transition-colors py-2 border-b border-border">Features</a>
                <Link to="/pricing" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground/70 hover:text-olo transition-colors py-2 border-b border-border">Pricing</Link>
                <Link to="/blog" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground/70 hover:text-olo transition-colors py-2 border-b border-border">Blog</Link>
                <Link to="/news" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground/70 hover:text-olo transition-colors py-2 border-b border-border">News</Link>
                <Link to="/community" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground/70 hover:text-olo transition-colors py-2 border-b border-border">Community</Link>
                <Link to="/sitemap" onClick={() => setOpen(false)} className="text-sm font-medium text-foreground/70 hover:text-olo transition-colors py-2 border-b border-border">Sitemap</Link>
                <Link
                  to="/free-scan"
                  onClick={() => setOpen(false)}
                  className="border border-olo/40 text-olo text-sm font-semibold px-4 py-2.5 rounded-xl text-center"
                >
                  Free scan
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="bg-olo text-white text-sm font-semibold px-4 py-2.5 rounded-xl text-center olo-glow"
                >
                  Get started
                </Link>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="h-px w-6 bg-gradient-to-r from-transparent to-olo/40" />
                  <span className="font-serif text-[10px] tracking-[0.18em] lowercase text-olo/70">designed by oluyo</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}