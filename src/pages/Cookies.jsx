import { Link } from 'react-router-dom';
import { Cookie, HardDrive, ShieldCheck, Trash2, MonitorSmartphone } from 'lucide-react';
import BackButton from '@/components/BackButton';

const STORAGE_ITEMS = [
  { name: 'unrufld_access_token', purpose: 'Authentication session token — keeps you signed in.', expiry: 'Cleared on sign-out' },
  { name: 'unrufld_app_id', purpose: 'Identifies which unrufld app to connect to.', expiry: 'Persistent (removed if you clear site data)' },
  { name: 'teewai-theme', purpose: 'Remembers your light/dark theme preference.', expiry: 'Persistent' },
  { name: 'teewai_text_zoom', purpose: 'Remembers your text-size zoom level (25%–150%).', expiry: 'Persistent' },
  { name: 'teewai_free_scan_consent', purpose: 'Records that you agreed to the Terms & Privacy Policy before a free scan.', expiry: 'Persistent' },
  { name: 'teewai_consent', purpose: 'Records your cookie/storage consent choice (accepted or rejected) and the timestamp of your last decision. Set by the consent banner on first visit; updated when you change your choice via "Cookie settings" in the footer.', expiry: 'Persistent' },
  { name: 'teewai_free_scans_used', purpose: 'Counts how many free no-signup scans you have used (limit: 3).', expiry: 'Persistent' },
  { name: 'teewai_session_id', purpose: 'First-party session ID sent to teewai\u2019s own servers for the admin live-visitor dashboard. Not shared with any third party.', expiry: 'Persistent' },
  { name: 'teewai_tour_seen', purpose: 'Records that you have seen the onboarding tour so it does not replay.', expiry: 'Persistent' },
  { name: 'teewai_native_app', purpose: 'Detects whether you are using the Android APK build (for offline shell behavior).', expiry: 'Persistent (web context clears it)' },
  { name: 'teewai_admin_token', purpose: 'Admin panel session token (security). Only set when an admin signs in.', expiry: 'Cleared on admin sign-out' },
];

export default function Cookies() {
  return (
    <div className="min-h-screen bg-background safe-area-inset-top">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <BackButton fallback="/" className="mb-8" />

        <div className="flex items-center gap-3 mb-2">
          <Cookie className="w-7 h-7 text-olo" />
          <h1 className="font-heading font-700 text-3xl sm:text-4xl tracking-tight">Cookies &amp; Local Storage Policy</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-8">Last updated: September 7, 2026</p>

        <div className="p-4 rounded-2xl bg-olo/10 border border-olo/20 text-foreground text-sm mb-8 flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-olo" />
          <p>
            <strong className="text-olo">No cookies. No third-party tracking.</strong> teewai does not use HTTP cookies,
            advertising cookies, or third-party tracking pixels. The unrufld platform's built-in analytics module has
            been disabled — no analytics events are collected or sent. Everything stored in your browser is strictly
            essential for the app to function.
          </p>
        </div>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-olo" /> What we store and why
            </h2>
            <p className="mb-4">
              teewai uses your browser's <strong className="text-foreground">local storage</strong> (not cookies) to
              remember essential settings and keep you signed in. Local storage data never leaves your device unless
              explicitly described below. Here is every item, its purpose, and when it expires:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-2xl overflow-hidden">
                <thead className="bg-muted/50 text-foreground">
                  <tr>
                    <th className="text-left p-3 font-heading font-600">Storage key</th>
                    <th className="text-left p-3 font-heading font-600">Purpose</th>
                    <th className="text-left p-3 font-heading font-600">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {STORAGE_ITEMS.map((item) => (
                    <tr key={item.name} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs text-foreground whitespace-nowrap">{item.name}</td>
                      <td className="p-3">{item.purpose}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{item.expiry}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2 flex items-center gap-2">
              <Cookie className="w-4 h-4 text-olo" /> Consent banner
            </h2>
            <p className="mb-3">
              On your first visit to teewai, a small consent card appears in the bottom-left corner of the screen.
              It asks you to <strong className="text-foreground">Accept all</strong> or{' '}
              <strong className="text-foreground">Reject non-essential</strong> storage. Both buttons are the same
              size — no pre-checked boxes, no dark patterns, and you can reject with a single click.
            </p>
            <p className="mb-3">
              <strong className="text-foreground">IP monitoring for abuse prevention and free-scan enforcement is essential and always active</strong>
              {' '}— it is not affected by your consent choice. This is stated directly in the banner. See our{' '}
              <Link to="/privacy" className="text-olo hover:underline">Privacy Policy</Link> for the legal basis
              (legitimate interest in protecting the platform and its users from abuse).
            </p>
            <p>
              <strong className="text-foreground">What "Reject non-essential" does:</strong> it prevents teewai from
              setting the <code className="text-foreground">teewai_session_id</code> local storage key and stops the
              periodic first-party visitor heartbeats that power the admin live-visitor counter. If you previously
              accepted and then reject, any existing session ID is removed. The unrufld platform's built-in analytics
              module is already disabled at the SDK configuration level, so there is no analytics session ID to gate.
            </p>
            <p className="mt-3">
              You can change your choice at any time by clicking <strong className="text-foreground">"Cookie settings"</strong>
              {' '}in the page footer — this re-opens the consent card and records your new choice with an updated timestamp
              in <code className="text-foreground">teewai_consent</code>.
            </p>
            <p className="mt-3">
              Your choice is saved in your browser. If you have an account, a dated record is also kept in your account for accountability.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">Analytics</h2>
            <p>
              The unrufld platform ships with a built-in analytics module that can collect session IDs and batch events.
              teewai has <strong className="text-foreground">disabled this module at the SDK configuration level</strong>.
              No <code className="text-foreground">unrufld_analytics_session_id</code> is written to your browser, and no
              analytics heartbeats or events are sent to any server. The only periodic request is the first-party
              <code className="text-foreground"> teewai_session_id</code> heartbeat (every 30&nbsp;seconds) to teewai's
              own backend, which powers the admin live-visitor counter — it is not shared with any third party.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2 flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4 text-olo" /> How to opt out / clear your data
            </h2>
            <p className="mb-3">Because everything stored is essential, clearing it will sign you out and reset your preferences. To do so:</p>
            <ul className="space-y-2 pl-1">
              <li className="flex items-start gap-2"><span className="text-olo mt-0.5">•</span> <span><strong className="text-foreground">Chrome / Edge:</strong> Settings → Privacy and security → Site settings → teewai → Clear data.</span></li>
              <li className="flex items-start gap-2"><span className="text-olo mt-0.5">•</span> <span><strong className="text-foreground">Safari:</strong> Preferences → Privacy → Manage Website Data → teewai → Remove.</span></li>
              <li className="flex items-start gap-2"><span className="text-olo mt-0.5">•</span> <span><strong className="text-foreground">Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data → Manage Data → teewai → Remove.</span></li>
              <li className="flex items-start gap-2"><span className="text-olo mt-0.5">•</span> <span><strong className="text-foreground">In-app:</strong> Sign out from the menu — this clears your auth token. You can also delete your entire account from your Profile, which permanently removes all data from teewai's servers.</span></li>
            </ul>
            <p className="mt-3 flex items-start gap-2 text-sm">
              <Trash2 className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
              <span>To delete your account and all associated data, go to your <Link to="/profile" className="text-olo hover:underline">Profile</Link> or contact support.</span>
            </p>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">Changes to this policy</h2>
            <p>If we add or change any storage item in the future, we will update this page with the new information and revise the date above.</p>
          </section>

          <section>
            <h2 className="font-heading font-600 text-lg text-foreground mb-2">Contact</h2>
            <p>Questions about this policy? Contact teewai support through the app or at <a href="mailto:help-desk@teewai.app" className="text-olo hover:underline">help-desk@teewai.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}