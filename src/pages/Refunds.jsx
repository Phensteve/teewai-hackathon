import { ShieldAlert } from 'lucide-react';
import BackButton from '@/components/BackButton';

export default function Refunds() {
  return (
    <div className="min-h-screen bg-background safe-area-inset-top">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <BackButton fallback="/" className="mb-8" />

        <h1 className="font-heading font-700 text-3xl sm:text-4xl tracking-tight mb-2">Refund Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: September 2026</p>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm mb-8 flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>teewai is a wellness companion, not a medical device. We strongly advise you to visit your dentist for professional dental care.</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">1. Our Commitment</h2>
            <p>We want you to feel confident using teewai. This policy explains when you are eligible for a refund on scan packs and subscriptions purchased through teewai.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">2. Scan Packs (One-Time Purchases)</h2>
            <p>Scan packs are one-time purchases of a fixed number of AI scans. Because scans are consumed immediately upon use, a scan pack is only eligible for a full refund when <strong>zero scans from the pack have been used</strong> and the request is made within <strong>7 days</strong> of purchase. Once any scan in the pack has been used, the pack is non-refundable.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">3. Subscriptions (Monthly &amp; Yearly)</h2>
            <p>Recurring subscriptions (Unlimited, Family Unlimited, and any monthly or yearly Pro plan) can be canceled at any time from the subscription page. Cancellation stops future renewals but does not automatically refund the current billing period. You retain access until the end of the period you have already paid for.</p>
            <p>If you cancel within <strong>3 days</strong> of a new subscription charge and have not used any premium scans in that new period, you may request a full refund of that charge. After the 3-day window, the period is non-refundable.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">4. Family Plan Refunds</h2>
            <p>Family pack and Family Unlimited purchases follow the same rules above. Refunds for family purchases are issued to the original payer only, and only when no member of the household has consumed scans from the purchase (for packs) or within the 3-day window (for subscriptions).</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">5. How to Request a Refund</h2>
            <p>To request a refund, contact our Customer Service team through the <a href="/support" className="text-olo underline">Support page</a> with your account email, the purchase reference, and the reason for your request. We aim to respond within <strong>3 business days</strong>. Approved refunds are returned to the original payment method within 5–10 business days, depending on your bank or payment provider.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">6. Non-Refundable Cases</h2>
            <p>Refunds will not be issued for: purchases where scans have already been consumed (outside the subscription 3-day window), charges more than 7 days old for scan packs, duplicate accounts you created, or purchases made through promotional or giveaway credits.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">7. Chargebacks</h2>
            <p>Please contact us before initiating a chargeback. Unwarranted chargebacks may result in account suspension. We are committed to resolving disputes fairly and promptly.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">8. Changes to This Policy</h2>
            <p>We may update this refund policy periodically. The version in effect at the time of your purchase applies to that purchase.</p>
          </section>
        </div>
      </div>
    </div>
  );
}