import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';
import SocialLinks from '@/components/SocialLinks';
import { openConsentBanner } from '@/lib/consent';
import { isNativeApp } from '@/lib/isNativeApp';

export default function LandingFooter() {
  return (
    <footer className="bg-olo-deep text-white pt-12 sm:pt-20 pb-10 relative z-10 overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-15" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-8 sm:gap-12 mb-12 sm:mb-16">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Logo size={38} className="olo-glow" />
              <span className="font-heading font-700 text-xl">teewai</span>
            </div>
            <p className="text-white/50 max-w-sm leading-relaxed">
              The AI powered teeth whitening companion. Snap, score and brighten your smile with teewai.
            </p>
            <p className="text-white/40 text-xs mt-4 max-w-sm leading-relaxed">
              teewai is an AI powered teeth whitening companion. We use your Google account to sign you in securely and create your profile, then analyze your teeth photos to score whiteness and build a personalized plan. Your data stays private and is not used to train models. Read our <Link to="/privacy" className="text-white/60 hover:text-olo underline">Privacy Policy</Link>.
            </p>
            <SocialLinks hoverClass="hover:text-olo" />
          </div>
          <div>
            <h4 className="font-heading font-600 text-sm uppercase tracking-wider text-white/40 mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li><a href="#how" className="hover:text-olo transition-colors">How it works</a></li>
              <li><a href="#features" className="hover:text-olo transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-olo transition-colors">Pricing</a></li>
              <li><Link to="/blog" className="hover:text-olo transition-colors">Blog</Link></li>
              <li><Link to="/news" className="hover:text-olo transition-colors">News</Link></li>
              <li><Link to="/community" className="hover:text-olo transition-colors">Community</Link></li>
              <li><Link to="/dashboard" className="hover:text-olo transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-600 text-sm uppercase tracking-wider text-white/40 mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li><Link to="/privacy" className="hover:text-olo transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-olo transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/refunds" className="hover:text-olo transition-colors">Refund Policy</Link></li>
              <li><Link to="/referral-policy" className="hover:text-olo transition-colors">Referral Policy</Link></li>
              <li><Link to="/cookies" className="hover:text-olo transition-colors">Cookies &amp; Local Storage</Link></li>
              {!isNativeApp() && (
                <li><button type="button" onClick={() => openConsentBanner('settings')} className="text-left hover:text-olo transition-colors">Cookie settings</button></li>
              )}
              <li><Link to="/help" className="hover:text-olo transition-colors">Help Center</Link></li>
              <li><Link to="/support" className="hover:text-olo transition-colors">Customer Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-white/40">
          <p>
            <Link to="/admin" className="text-white/40 hover:text-white/40 transition-colors" aria-label="Admin" title="©">
              ©
            </Link>{' '}
            2026 teewai. All rights reserved.
          </p>
          <div className="text-left sm:text-right">
            <p>Made with the rare <span className="text-olo">olo</span> color.</p>
            <p className="text-xs text-white/30 mt-1">A product of <span className="text-white/50 font-medium">unrufld corp</span>.</p>
            <p className="text-xs text-white/30 mt-1">RC - 9745271</p>
            <p className="text-xs text-white/30 mt-1">Designed by <span className="text-white/50 font-medium">oluyo</span>.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}