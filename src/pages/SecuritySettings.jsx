import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { getConsent, setConsent, openConsentBanner } from '@/lib/consent';
import { isNativeApp } from '@/lib/isNativeApp';
import { Switch } from '@/components/ui/switch';
import Spinner from '@/components/Spinner';
import { Shield, KeyRound, MonitorSmartphone, Eye, Lock, Check, Loader2, LogOut, ExternalLink, Info } from 'lucide-react';

// Dedicated security hub: password reset, active session management, and
// granular privacy toggles. IP monitoring for abuse prevention is always
// active (essential, legitimate-interest basis) and is clearly labelled as
// non-toggleable — the only user-controllable toggle is non-essential tracking
// (the visitor heartbeat), which maps to the consent system.
export default function SecuritySettings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [native] = useState(() => isNativeApp());
  const [deviceLabel, setDeviceLabel] = useState('This device');

  useEffect(() => {
    (async () => {
      try {
        const me = await unrufld.auth.me();
        setUser(me);
      } catch { /* non-fatal */ } finally { setLoading(false); }
    })();
    // Reflect current consent choice (non-essential tracking).
    setTrackingEnabled(getConsent()?.choice === 'accepted');
    // Parse a friendly device label from the user agent.
    try {
      const ua = navigator.userAgent;
      let browser = 'Browser';
      if (/Edg/.test(ua)) browser = 'Edge';
      else if (/Chrome/.test(ua)) browser = 'Chrome';
      else if (/Safari/.test(ua)) browser = 'Safari';
      else if (/Firefox/.test(ua)) browser = 'Firefox';
      let os = '';
      if (/Windows/.test(ua)) os = 'Windows';
      else if (/Mac/.test(ua)) os = 'macOS';
      else if (/Android/.test(ua)) os = 'Android';
      else if (/iPhone|iPad/.test(ua)) os = 'iOS';
      setDeviceLabel(os ? `${browser} · ${os}` : browser);
    } catch { /* */ }

    // Live-update the toggle if consent changes elsewhere (e.g. the banner).
    const handler = () => setTrackingEnabled(getConsent()?.choice === 'accepted');
    window.addEventListener('teewai:consent-change', handler);
    return () => window.removeEventListener('teewai:consent-change', handler);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await unrufld.auth.logout('/login'); } catch { setSigningOut(false); }
  };

  const handleTrackingToggle = (enabled) => {
    setTrackingEnabled(enabled);
    setConsent(enabled ? 'accepted' : 'rejected');
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-6 h-6 text-olo" />
        <h1 className="font-heading font-700 text-2xl tracking-tight">Account Security</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-3">
        Manage your password, active sessions, and privacy preferences.
      </p>

      {/* Password */}
      <section className="p-5 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-base">Password</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Reset your password to change it on all devices. We'll send a secure reset link to your email.
        </p>
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.email || 'your email'}</p>
            <p className="text-xs text-muted-foreground">Signed in with this account</p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-olo border border-olo/30 bg-olo/5 px-4 py-2 rounded-xl hover:bg-olo/10 transition-colors whitespace-nowrap"
          >
            <KeyRound className="w-4 h-4" /> Reset password
          </Link>
        </div>
      </section>

      {/* Active sessions */}
      <section className="p-5 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <MonitorSmartphone className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-base">Active sessions</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          This is the device you're currently using. To end sessions on other devices, reset your password above.
        </p>
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
              <MonitorSmartphone className="w-5 h-5 text-olo" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{deviceLabel}</p>
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active now
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive border border-destructive/30 bg-destructive/5 px-4 py-2 rounded-xl hover:bg-destructive/10 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Sign out
          </button>
        </div>
      </section>

      {/* Privacy & data */}
      <section className="p-5 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-base">Privacy &amp; data</h2>
        </div>

        {/* Non-essential tracking toggle (visitor heartbeat) */}
        {!native && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-background border border-border mb-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Visitor analytics</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allows a first-party session ID for the live visitor counter. No third-party tracking.
              </p>
            </div>
            <Switch checked={trackingEnabled} onCheckedChange={handleTrackingToggle} />
          </div>
        )}

        {/* IP monitoring — always active, not toggleable */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
          <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">IP monitoring</p>
              <span className="text-[10px] font-semibold text-olo bg-olo/10 px-2 py-0.5 rounded-full uppercase tracking-wide">Always on</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Essential for security and free-scan abuse prevention. This is always active and cannot be turned off.
            </p>
          </div>
          <Switch checked={true} disabled={true} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/privacy" className="inline-flex items-center gap-1 text-xs text-olo hover:underline font-medium">
            <ExternalLink className="w-3 h-3" /> Privacy Policy
          </Link>
          {!native && (
            <button onClick={openConsentBanner} className="inline-flex items-center gap-1 text-xs text-olo hover:underline font-medium">
              <ExternalLink className="w-3 h-3" /> Cookie settings
            </button>
          )}
        </div>
      </section>

      {/* Security tips */}
      <section className="p-5 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-base">Security tips</h2>
        </div>
        <ul className="space-y-2.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
            <span>Use a unique password you don't reuse on other sites.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
            <span>Reset your password if you suspect unauthorized access — it ends all other sessions.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
            <span>Sign out from shared or public devices when you're done.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}