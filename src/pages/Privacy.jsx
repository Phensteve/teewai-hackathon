import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Lock, Server, Eye, Globe, Cpu } from 'lucide-react';
import BackButton from '@/components/BackButton';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background safe-area-inset-top">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <BackButton fallback="/" className="mb-8" />

        <h1 className="font-heading font-700 text-3xl sm:text-4xl tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: October 8, 2026</p>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm mb-6 flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>teewai is a wellness companion, not a medical device. We strongly advise you to visit your dentist for professional dental care.</p>
        </div>

        <div className="p-4 rounded-2xl bg-olo/10 border border-olo/20 text-foreground text-sm mb-8 flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-olo" />
          <p><strong className="text-olo">Your teeth photos are safe with teewai.</strong> They are protected by access controls and encrypted in transit (TLS 1.2+), are never sold or shared with third parties, and are used only to generate your personal scan results. They're yours — delete any scan or your whole account anytime and they're gone for good.</p>
        </div>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">1. Data We Collect</h2>
            <p>We collect your email, name, teeth scan photos, scan results, and usage data (streaks, scores, badges). If you sign in with Google, we receive only the name and email address associated with your Google account; we do not request access to any other Google data. Photos are used to generate AI analysis and are stored securely.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">2. How We Use Your Data</h2>
            <p>Your data is used to provide scan analysis, track progress, generate recommendations, display leaderboards (anonymized), and send reminders. We do not sell your data to third parties. We use your Google account information only to authenticate you and create your account — we do not transfer it to others or use it for advertising.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">3. Photo Storage & Safety</h2>
            <p>Your teeth photos are stored securely and associated only with your account. They are protected by access controls and encrypted in transit (TLS 1.2+), are never sold, and are never shared with or sent to any third party beyond what is described in Section 4. Photos are used solely to generate your personal scan analysis. You can delete individual scans or your entire account at any time, which permanently removes your photos — no copies retained.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">4. AI Processing & Third-Party Providers</h2>
            <div className="space-y-3">
              <p>To generate your scan analysis, your teeth photo goes through a two-stage pipeline: first an <strong className="text-foreground">AI vision model</strong> performs the visual analysis, then <strong className="text-foreground">unrufldteeth™</strong> — teewai's proprietary dental intelligence engine — computes the calibrated scores and clinical interpretations. Here's exactly what happens:</p>
              <div className="space-y-2 pl-4 border-l-2 border-olo/20">
                <p className="flex items-start gap-2"><Server className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">What is sent:</strong> Your single teeth photo and a text prompt asking the AI to analyze whiteness, shade, stains, and dental health. No other personal data (name, email, location) is included in the AI request.</span></p>
                <p className="flex items-start gap-2"><Lock className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Encryption in transit:</strong> Your photo is transmitted to the AI model over HTTPS (TLS 1.2+), the same encryption standard used by banks and online stores. Your photo is never sent over an unencrypted connection.</span></p>
                <p className="flex items-start gap-2"><Eye className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">What the AI provider does with it:</strong> The AI provider processes the photo to return the analysis result. Your photo is not stored by the provider after the response is returned, and is not used to train their models.</span></p>
                <p className="flex items-start gap-2"><Globe className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Where it's processed:</strong> The AI provider processes the request in secure, compliant cloud infrastructure.</span></p>
                <p className="flex items-start gap-2"><Cpu className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">unrufldteeth™ (teewai's engine):</strong> After the AI model returns the raw analysis, unrufldteeth takes over — not a third-party service. It reads pixel-level color data directly from your photo to measure brightness and shade precisely, then computes your calibrated whiteness score, VITA Classical & Bleached shade mapping, per-tooth color analysis, smile-zone score, whitening potential, and clinical-index interpretations (plaque, gingival, erosion, caries). Because it runs as a deterministic computation engine, it adds only milliseconds of processing time with no additional network round-trip — your results come back fast, and no additional third party ever receives your photo. unrufldteeth does not retain, learn from, or train on your images.</span></p>
              </div>
              <p><strong className="text-foreground">How unrufldteeth works:</strong> unrufldteeth is teewai's proprietary dental intelligence engine — a pure, deterministic computation layer that transforms Google Gemini's raw vision output into calibrated, clinically grounded scores. Rather than relying on a black-box AI for the numbers you see, it applies published dental indices as fixed math: VITA Classical & Bleached shade mapping, the Silness & Löe Plaque Index, the Löe & Silness Gingival Index, the Basic Erosive Wear Examination (BEWE), DMF/DMFS, ICDAS, OHI-S, and AAP/EFP 2018 periodontal staging. This means your whiteness score, dental health score, per-tooth analysis, stain identification, and personalized whitening timeline are reproducible and explainable — the same photo always produces the same result. It runs as a deterministic computation layer, so your photo is not sent to any additional third party after the AI analysis, and the engine discards all intermediate data once your scan is complete.</p>
              <p className="text-sm">For product recommendations (whitening methods, dental products), the AI may use web search to find current, evidence-based suggestions. This search is also performed via the same AI provider's infrastructure under the same security standards.</p>
            </div>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">5. Leaderboards & Social</h2>
            <p>The smile leaderboard shows only the display name or username you choose — <strong className="text-foreground">never your real name or email</strong>. If you sign in with Google, your real name is never shown to other users; it is used only to create your account. You can <strong className="text-foreground">opt out of the leaderboard at any time from your Profile settings</strong> — when opted out, you will not appear in any public ranking, and your scans continue to count privately. You can also change your display name at any time from your Profile.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">Sharing Your Scan Data with Your Dentist</h2>
            <p><strong className="text-foreground">You are in control of all sharing.</strong> teewai lets you assign dentists and share your scan data with them — but nothing is ever shared without your explicit, informed consent. Here's exactly how it works:</p>
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-olo/20">
              <p><strong className="text-foreground">Primary dentist:</strong> When you assign a primary dentist and consent, they can see <em className="text-foreground">all</em> your scan reports — whiteness scores, shade matching, recommendations, AI feedback, and gamification progress. They do <strong className="text-foreground">not</strong> see your scan photos unless you explicitly turn on the "photo access" toggle (off by default). You can have only one primary dentist at a time; assigning a new one automatically revokes the old one's access.</p>
              <p><strong className="text-foreground">Secondary dentists:</strong> A secondary dentist can only see the <em className="text-foreground">individual scans you choose to share</em> — not your full scan history. For each shared scan, you decide whether to include the photo ("Report + photos") or share the report data only ("Report only").</p>
              <p><strong className="text-foreground">Consent gate:</strong> No dentist sees anything until you explicitly consent. The consent dialog explains exactly what the dentist will access before you confirm. There are no pre-consented defaults.</p>
              <p><strong className="text-foreground">Revocation:</strong> You can revoke any assignment or unshare any scan at any time. Revocation is immediate — the dentist loses access to your data right away. When you revoke a primary dentist, their access is removed from all your scans. When you unshare a scan, the shared report snapshot is deleted from the share record.</p>
              <p><strong className="text-foreground">What dentists see about each other:</strong> Dentists cannot see which other dentists you've assigned or what you've shared with them. Each dentist only sees their own assignments and shares.</p>
              <p><strong className="text-foreground">Server-side enforcement:</strong> All access checks are enforced by Row-Level Security (RLS) on teewai's server — not just by hiding content in the app. A dentist cannot query another dentist's patients or scans. A patient cannot see another patient's data.</p>
            </div>
            <p className="mt-3">This is your health data. teewai takes your privacy seriously — you decide who sees what, and you can change your mind at any time.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">6. Data Retention</h2>
            <p>Your data is retained while your account is active. Upon account deletion, all personal data including photos is permanently removed within 30 days. Scan pack purchases and their expiration dates are retained as part of your subscription record for billing and audit purposes.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">7. Your Rights</h2>
            <p>You have the right to access, export, or delete your data at any time. Contact teewai support to exercise these rights.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">8. Admin Access Security</h2>
            <p>Access to teewai's admin panel is protected by multiple layers of security: strong password hashing (PBKDF2), rate-limiting to prevent brute-force attacks, and <strong className="text-foreground">mandatory two-factor authentication (TOTP 2FA) for all admin accounts</strong> — no admin can sign in without a verification code from an authenticator app. IP address restrictions can additionally be configured to limit admin access to approved networks. All admin actions are logged in a tamper-evident audit trail.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">9. IP Address & Abuse Prevention</h2>
            <p><strong className="text-foreground">IP monitoring is essential for security and is always active</strong> — it is not affected by your cookie/storage consent choice. We monitor IP addresses to prevent abuse and enforce our free-scan limits. This processing is based on our legitimate interest in protecting the platform and its users from abuse (see below).</p>
            <p className="mt-3"><strong className="text-foreground">Web app:</strong> We monitor IP addresses to prevent abuse and enforce free-scan limits (always active, not affected by your cookie choice). This includes guest-post rate-limiting, free-scan enforcement, and signup abuse prevention.</p>
            <p className="mt-3"><strong className="text-foreground">Native app (APK):</strong> We record your IP address <strong className="text-foreground">only once, at account creation</strong>, to enforce signup limits — no ongoing IP monitoring. Scans, community activity, and all other features in the native app do not log or check your IP address.</p>
            <p className="mt-3">We log IP addresses to keep teewai safe and free of spam. When you post as a guest in discussion rooms or create a free account, we record your IP address together with the number of posts or accounts created from it and the time of your last activity. We use this information only to prevent spam, mass account creation, and other abuse — for example, by limiting how many guest posts or free accounts can be created from a single IP address, and by rate-limiting guest posts and free signups.</p>
            <p className="mt-3">Free no-signup scans are limited to 3 per IP address. We log your IP address solely to enforce this limit and prevent abuse — we never use it for advertising or profiling. Before taking a free scan, you must agree to our Terms &amp; Conditions and this Privacy Policy. Once you've used your 3 free scans on a given network, you'll need to sign in or create a free account to keep scanning — signed-in users have their own scan allocation.</p>
            <p className="mt-3">This processing is based on our legitimate interest in protecting the platform and its users from abuse. Records of normal activity are kept for up to 90 days; records linked to a block or ban are kept until the matter is resolved. We never sell this data, and we never use it for advertising or profiling.</p>
            <p className="mt-3">If you believe your IP was blocked in error, contact us through the app's support route and we will review it (see Section 10 for how to reach us).</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">10. Cookies & Tracking</h2>
            <p>teewai uses your browser's local storage (not HTTP cookies) to remember essential settings and keep you signed in. We do not use third-party advertising or tracking cookies. The unrufld platform's built-in analytics module has been disabled — no analytics events are collected or sent to any third party. For a complete list of every storage item, its purpose, and how to clear it, see our <Link to="/cookies" className="text-olo hover:underline">Cookies &amp; Local Storage Policy</Link>.</p>
            <p className="mt-3">A first-party session identifier (<code className="text-foreground">teewai_session_id</code>) is stored in your browser's local storage and sent to teewai's servers periodically while the app is open. This powers the admin dashboard's live visitor counter and traffic graph. It is not shared with any third party and is not used for advertising or profiling. <strong className="text-foreground">This is the only non-essential storage item</strong> — when you click "Reject non-essential" in the consent banner, teewai does not set this key and sends no visitor heartbeats. IP monitoring for abuse prevention and free-scan enforcement remains active regardless of your choice (see Section 9).</p>
            <p className="mt-3">When you first visit teewai, a consent banner asks you to accept or reject non-essential storage. You can change your choice at any time via "Cookie settings" in the footer. See our <Link to="/cookies" className="text-olo hover:underline">Cookies &amp; Local Storage Policy</Link> for the full list of storage items and what "Reject non-essential" gates.</p>
            <p className="mt-3">Your choice is saved in your browser. If you have an account, a dated record is also kept in your account for accountability.</p>
          </section>
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">11. Contact</h2>
            <p>For privacy questions, please contact teewai support through the app or at <a href="mailto:help-desk@teewai.app" className="text-olo hover:underline">help-desk@teewai.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}