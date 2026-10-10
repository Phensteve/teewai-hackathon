import { Link } from 'react-router-dom';
import { Gift, Shield, Clock, CheckCircle2, Smartphone, Building2 } from 'lucide-react';
import BackButton from '@/components/BackButton';

export default function ReferralPolicy() {
  return (
    <div className="min-h-screen bg-background safe-area-inset-top">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <BackButton fallback="/" className="mb-8" />

        <h1 className="font-heading font-700 text-3xl sm:text-4xl tracking-tight mb-2">Referral Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: October 5, 2026</p>

        <div className="p-4 rounded-2xl bg-olo/10 border border-olo/20 text-foreground text-sm mb-8 flex items-start gap-2">
          <Gift className="w-5 h-5 flex-shrink-0 mt-0.5 text-olo" />
          <p><strong className="text-olo">Earn ₦50 for every friend who scans.</strong> teewai rewards you for sharing your smile journey — ₦50 per successful referral, paid once per referral from the very first one, with no caps or pair-waiting.</p>
        </div>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">1. How the Referral Program Works</h2>
            <p>teewai's referral program lets you earn money by inviting friends to try teewai. Here's the complete process:</p>
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-olo/20">
              <p><strong className="text-foreground">Step 1 — Share your code:</strong> Every paid teewai user gets a unique referral code (format: TEE-XXXXXX). Share it with friends via your referral link or the code itself.</p>
              <p><strong className="text-foreground">Step 2 — They sign up:</strong> Your friend creates a teewai account using your referral link or by entering your code during registration.</p>
              <p><strong className="text-foreground">Step 3 — They complete their first scan:</strong> A referral is not counted until your friend takes their first teeth scan. Signup alone does not earn a reward — the scan completion gate ensures referrals are genuine.</p>
              <p><strong className="text-foreground">Step 4 — You earn ₦50:</strong> The moment your friend's first scan completes, ₦50 is credited to your referral balance. This happens once per referral — not per scan — so each friend earns you exactly ₦50, one time.</p>
            </div>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">2. Reward Structure</h2>
            <div className="space-y-3">
              <p><strong className="text-foreground">Reward amount:</strong> ₦50 per successful referral.</p>
              <p><strong className="text-foreground">From the first referral:</strong> There is no minimum number of referrals before you start earning. Your first successful referral earns ₦50 immediately.</p>
              <p><strong className="text-foreground">Once per referral:</strong> Each referral pays exactly once. If your friend scans again later, you do not earn another ₦50 — the reward is for the first scan only.</p>
              <p><strong className="text-foreground">No cap:</strong> There is no limit on how many referrals you can earn from. Invite 10 friends, earn ₦500. Invite 100, earn ₦5,000.</p>
            </div>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">3. Eligibility</h2>
            <p>To participate in the referral program, you must have an active paid teewai plan. Your referral code activates when you subscribe and pauses if your subscription lapses.</p>
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-olo/20">
              <p><strong className="text-foreground">Unlimited plans (Pro, Pro Yearly, Family Pro):</strong> Your code is active while your renewal date is in the future.</p>
              <p><strong className="text-foreground">Scan packs:</strong> Your code is active while you have remaining scans.</p>
              <p><strong className="text-foreground">Free plan:</strong> Free accounts cannot participate in referrals. You must upgrade to a paid plan to earn referral rewards.</p>
            </div>
            <p className="mt-3">If your subscription lapses, your referral code pauses and new referrals made with your code will not be tracked. Any balance you've already earned remains yours to withdraw.</p>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">4. Withdrawals</h2>
            <p>You can withdraw your referral earnings in two ways:</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card">
                <Smartphone className="w-5 h-5 text-olo flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Airtime</p>
                  <p className="text-sm mt-1">Withdraw from <strong className="text-foreground">₦50</strong> — right from your first referral. Airtime is delivered to your phone number instantly via Peyflex.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card">
                <Building2 className="w-5 h-5 text-olo flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Bank transfer</p>
                  <p className="text-sm mt-1">Withdraw from <strong className="text-foreground">₦2,000</strong>. Funds are sent directly to your Nigerian bank account. (Coming soon.)</p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-2xl bg-muted/40 border border-border flex items-start gap-2">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm">Airtime withdrawals are delivered <strong className="text-foreground">instantly</strong>. Bank transfers are coming soon. You can have one active withdrawal request at a time.</p>
            </div>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">5. Anti-Exploitation & Fair Use</h2>
            <p>teewai takes referral integrity seriously. The following protections ensure the program rewards genuine referrals and cannot be gamed:</p>
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-olo/20">
              <p className="flex items-start gap-2"><Shield className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Self-referral prevention:</strong> You cannot refer yourself. A referral where the invited user is the same as the referrer is automatically blocked.</span></p>
              <p className="flex items-start gap-2"><Shield className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Same-device prevention:</strong> If the invited user's device fingerprint matches a device previously registered to the referrer, the referral is blocked. Creating a second account on the same phone to self-refer will not work.</span></p>
              <p className="flex items-start gap-2"><Shield className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Circular-referral prevention:</strong> If user A referred user B, user B cannot refer user A back. This prevents A→B→A reward farming loops.</span></p>
              <p className="flex items-start gap-2"><Shield className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Duplicate prevention:</strong> The same referrer cannot refer the same invited user twice. Each referrer–invitee pair is tracked once.</span></p>
              <p className="flex items-start gap-2"><Shield className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Scan-completion gate:</strong> Rewards only credit after a real scan, not just a signup. Each referred friend must actually use teewai and complete a scan.</span></p>
              <p className="flex items-start gap-2"><Shield className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">IP & device limiting:</strong> Free account creation is limited to 3 per IP address and 3 per device, making bot farming expensive (each fake account needs a unique IP, device, email, and completed scan).</span></p>
              <p className="flex items-start gap-2"><Shield className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Atomic balance updates:</strong> Balance changes use atomic database operations to prevent race conditions that could double-credit or lose increments.</span></p>
              <p className="flex items-start gap-2"><Shield className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Idempotent withdrawals:</strong> Each withdrawal has a unique idempotency key, and only one pending withdrawal is allowed per user at a time.</span></p>
            </div>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">6. Blocked Referrals</h2>
            <p>If a referral is blocked by any of the anti-exploitation checks above, it is recorded with the block reason (self_referral, same_device, circular, or same_email) and is <strong className="text-foreground">not credited</strong>. Blocked referrals are visible to teewai admins for audit and review. Attempting to circumvent these protections may result in forfeiture of referral earnings and account suspension.</p>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">7. Payout Provider</h2>
            <p>Airtime withdrawals are processed via <strong className="text-foreground">Peyflex</strong>, a Nigerian airtime top-up provider. Peyflex handles the instant delivery of airtime to your phone number. teewai does not store your phone number beyond what is needed to process the withdrawal. Payout references and statuses are recorded on your withdrawal record for your records.</p>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">8. Your Responsibilities</h2>
            <div className="space-y-2">
              <p>By participating in the referral program, you agree to:</p>
              <div className="pl-4 border-l-2 border-olo/20 space-y-2">
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span>Share your referral code only with people you genuinely know and who might benefit from teewai.</span></p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span>Not create fake or duplicate accounts to self-refer or inflate your referral count.</span></p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span>Not spam or send unsolicited bulk messages with your referral link.</span></p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span>Provide accurate bank account or phone number details for withdrawals. teewai is not liable for funds sent to incorrect details you provided.</span></p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">9. Program Changes</h2>
            <p>teewai reserves the right to modify the reward amount, withdrawal thresholds, or eligibility criteria at any time. Any changes to the reward amount will apply to referrals completed after the change — referrals already rewarded are not affected. Material changes will be announced in the app. Continued participation after a change constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">10. Account Suspension & Forfeiture</h2>
            <p>If teewai determines that you have violated these referral terms — through bot farming, self-referral, spamming, or any other abuse — teewai may suspend your account, void unwithdrawn referral earnings, and block future participation in the referral program. Withdrawn earnings that have already been paid out are not clawed back except in cases of proven fraud.</p>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">11. Contact</h2>
            <p>For questions about the referral program, contact teewai support through the app or at <a href="mailto:help-desk@teewai.app" className="text-olo hover:underline">help-desk@teewai.app</a>. Ready to start earning? <Link to="/referrals" className="text-olo hover:underline">Go to Refer &amp; earn</Link>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}