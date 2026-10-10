import { ShieldAlert } from 'lucide-react';
import BackButton from '@/components/BackButton';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background safe-area-inset-top">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <BackButton fallback="/" className="mb-8" />

        <h1 className="font-heading font-700 text-3xl sm:text-4xl tracking-tight mb-2">Terms & Conditions</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: October 8, 2026</p>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm mb-8 flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>teewai is a wellness companion, not a medical device. We strongly advise you to visit your dentist for professional dental care.</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account or using teewai, you agree to these Terms & Conditions. If you do not agree, please do not use the app.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">2. Not a Medical Device</h2>
            <p>teewai provides AI-assisted teeth whitening tracking and recommendations for wellness purposes only. It is not a medical device, does not diagnose conditions, and is not a substitute for professional dental advice, diagnosis, or treatment. Always seek the advice of your dentist with any questions about your oral health.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">3. Scan Accuracy</h2>
            <p>AI analysis results may vary based on photo quality, lighting, and other factors. Scores are estimates and should not be treated as clinical measurements. For best results, include a reference shade guide in your photos.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">4. Subscriptions & Scan Packs</h2>
            <p>teewai offers Free, Daily, Weekly, Monthly, and Yearly plans, plus one-time scan packs. Subscriptions auto-renew unless canceled. You can manage or cancel your subscription at any time from the subscription page.</p>
            <p className="mt-3"><strong className="text-foreground">Scan Pack Expiration:</strong> Scan packs (Starter, Plus, Boost, Family, and Custom) expire 30 days after purchase. The Daily scan pack expires 24 hours after purchase. Any unused scans remaining after the expiration date will be forfeited.</p>
            <p className="mt-3"><strong className="text-foreground">Rollover:</strong> When you renew an unlimited subscription on time, unused pack scans roll over into your next billing cycle for a limited grace period: 1.5 weeks for monthly, 1.5 months for yearly, and 1 day for weekly subscriptions. If you do not renew before the rollover deadline, unused scans are forfeited.</p>
            <p className="mt-3"><strong className="text-foreground">Referral Eligibility:</strong> An active (non-expired) plan or scan pack is required both to earn referral rewards and to trigger a referrer's reward when you scan. If your plan or pack expires, you become ineligible for referrals until you purchase a new one.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">5. User Conduct</h2>
            <p>You agree to upload only your own teeth photos, not to misuse the service, and not to attempt to reverse-engineer the teewai scoring algorithm.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">6. Limitation of Liability</h2>
            <p>teewai is provided "as is" without warranties of any kind. We are not liable for any decisions made based on scan results or recommendations.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">7. Changes to Terms</h2>
            <p>We may update these terms periodically. Continued use after changes constitutes acceptance.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">8. Acceptable Use & Anti-Abuse</h2>
            <p>Free accounts and guest access are provided as a courtesy and may be limited. We monitor IP addresses to enforce limits on the number of free accounts and guest posts that can be created from a single IP. You agree not to create accounts through automated means (including bots and scripts), not to create accounts for the purpose of circumventing usage limits, and not to use proxies, VPNs, or other tools to evade these limits. We may, at our discretion, rate-limit, block, suspend, or ban any account or IP address that violates these terms. If you believe you have been blocked in error, contact us and we will review the decision.</p>
            <p className="mt-3"><strong className="text-foreground">Web app:</strong> We monitor IP addresses to prevent abuse and enforce free-scan limits (always active, not affected by your cookie/storage consent choice). This includes guest-post rate-limiting, free-scan enforcement, and signup abuse prevention.</p>
            <p className="mt-3"><strong className="text-foreground">Native app (APK):</strong> We record your IP address <strong className="text-foreground">only once, at account creation</strong>, to enforce signup limits — no ongoing IP monitoring. Scans, community activity, and all other features in the native app do not log or check your IP address.</p>
            <p className="mt-3">Free no-signup scans are limited to 3 per IP address. You must agree to these Terms and our Privacy Policy before taking a free scan. After 3 free scans on a given network, you must sign in or create an account to continue scanning. We log IP addresses solely to enforce this limit and prevent abuse.</p>
          </section>
        </div>
      </div>
    </div>
  );
}