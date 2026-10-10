import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';
import { MakersMark } from './HandDrawn';
import SocialLinks from '@/components/SocialLinks';

export default function HomeTestFooter() {
  return (
    <footer className="relative z-10 px-4 pt-14 pb-10 border-t border-white/[0.06]" style={{ background: 'rgba(6,18,26,0.9)' }}>
      <div className="absolute inset-0 grid-pattern opacity-[0.06]" />
      <div className="relative max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 sm:gap-12 mb-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Logo size={34} />
              <span className="font-heading font-700 tracking-tight text-lg text-white">teewai</span>
            </Link>
            <p className="text-sm text-white/55 max-w-sm leading-relaxed mb-4">
              {'Not your dentist \u2014 your dental companion. Snap a photo, get an honest whiteness score, and follow a plan that actually fits your life. Made with care in Nigeria.'}
            </p>
            <p className="text-xs text-white/40 max-w-sm leading-relaxed">
              teewai is an AI-powered teeth-whitening companion. We use your Google account to sign you in securely and create your profile — then analyze your teeth photos to score whiteness and build a personalized plan. Your data is never sold and never used to train models. Read our <Link to="/privacy" className="text-white/60 hover:text-[#5eead4] underline">Privacy Policy</Link>.
            </p>
            <SocialLinks hoverClass="hover:text-[#5eead4]" />
          </div>
          <div>
            <h4 className="font-heading font-600 text-xs uppercase tracking-wider text-white/40 mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li><a href="#how" className="hover:text-white transition-colors">How it works</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-600 text-xs uppercase tracking-wider text-white/40 mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link to="/support" className="hover:text-white transition-colors">Customer Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <p className="flex items-center gap-2">
            <MakersMark className="w-5 h-5 opacity-40" color="#5eead4" />
            <Link to="/admin" className="text-white/40 hover:text-white/60 transition-colors" aria-label="Admin" title="\u00A9">{'\u00A9'}</Link>
            {' '}{new Date().getFullYear()} teewai. All rights reserved.
          </p>
          <div className="text-center sm:text-right">
            <p>Made with the rare <span className="text-[#5eead4]">olo</span> color.</p>
            <p className="text-white/30 mt-1">A product of <span className="text-white/50 font-medium">unrufld corp</span>.</p>
            <p className="text-white/30 mt-1">RC - 9745271</p>
            <p className="text-white/30 mt-1">Designed by <span className="text-white/50 font-medium">oluyo</span>.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}