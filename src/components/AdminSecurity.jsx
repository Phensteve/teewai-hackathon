import { useState, useEffect } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import { Shield, KeyRound, Copy, Check, Loader2, AlertTriangle, Globe, Lock } from 'lucide-react';

export default function AdminSecurity({ callerRole }) {
  const [totpStatus, setTotpStatus] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [allowlist, setAllowlist] = useState('');
  const [savedAllowlist, setSavedAllowlist] = useState([]);

  const load = async () => {
    try {
      const [status, ip] = await Promise.all([adminAuth.getTotpStatus(), adminAuth.getIpAllowlist()]);
      setTotpStatus(status);
      setSavedAllowlist(ip.allowlist || []);
      setAllowlist((ip.allowlist || []).join('\n'));
    } catch (e) {
      setError(e.message || 'Failed to load security settings');
    }
  };

  useEffect(() => { load(); }, []);

  const startEnrollment = async () => {
    setError('');
    setBusy('enroll');
    try {
      const data = await adminAuth.enrollTotp();
      setEnrollment(data);
    } catch (e) {
      setError(e.message || 'Enrollment failed');
    } finally {
      setBusy('');
    }
  };

  const confirmEnrollment = async () => {
    setError('');
    if (!confirmCode.trim()) { setError('Enter the 6-digit code from your authenticator app'); return; }
    setBusy('confirm');
    try {
      await adminAuth.confirmTotp(confirmCode.trim());
      setEnrollment(null);
      setConfirmCode('');
      await load();
    } catch (e) {
      setError(e.message || 'Invalid code');
    } finally {
      setBusy('');
    }
  };

  const cancelEnrollment = () => {
    setEnrollment(null);
    setConfirmCode('');
    setError('');
  };

  const disable2FA = async () => {
    if (!confirm('Disable 2FA for your account? This will make login less secure.')) return;
    setError('');
    setBusy('disable');
    try {
      await adminAuth.disableTotp();
      await load();
    } catch (e) {
      setError(e.message || 'Failed to disable 2FA');
    } finally {
      setBusy('');
    }
  };

  const saveAllowlist = async () => {
    setError('');
    setBusy('ip');
    try {
      const data = await adminAuth.setIpAllowlist(allowlist);
      setSavedAllowlist(data.allowlist || []);
      setAllowlist((data.allowlist || []).join('\n'));
    } catch (e) {
      setError(e.message || 'Failed to save IP allowlist');
    } finally {
      setBusy('');
    }
  };

  const copySecret = () => {
    if (enrollment?.secret) {
      navigator.clipboard.writeText(enrollment.secret).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isSuperAdmin = callerRole === 'super_admin';

  return (
    <div className="space-y-6">
      {/* 2FA section */}
      <div className="p-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-olo" />
          </div>
          <div>
            <h3 className="font-heading font-600 text-lg">Two-factor authentication</h3>
            <p className="text-sm text-muted-foreground">Require a verification code from your authenticator app on every sign-in.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/20 bg-destructive/5 mb-4">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {totpStatus?.enabled ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-5 h-5 text-emerald-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">2FA is active</p>
              <p className="text-xs text-muted-foreground">Your account is protected by a verification code.</p>
            </div>
            <button
              onClick={disable2FA}
              disabled={!!busy}
              className="text-sm text-destructive hover:underline disabled:opacity-50"
            >
              {busy === 'disable' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable'}
            </button>
          </div>
        ) : enrollment ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-olo/5 border border-olo/20">
              <p className="text-sm font-medium mb-2">1. Add to your authenticator app</p>
              <p className="text-xs text-muted-foreground mb-3">Scan the QR code or manually enter this secret key:</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background border border-border font-mono text-sm break-all">
                <code className="flex-1">{enrollment.secret}</code>
                <button onClick={copySecret} className="text-muted-foreground hover:text-olo flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 break-all font-mono">{enrollment.otpauth_url}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">2. Enter the 6-digit code from your app</p>
              <div className="flex gap-2">
                <input
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono tracking-widest focus:outline-none focus:border-olo"
                />
                <button
                  onClick={confirmEnrollment}
                  disabled={busy === 'confirm' || confirmCode.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-olo text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {busy === 'confirm' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Activate
                </button>
                <button onClick={cancelEnrollment} className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={startEnrollment}
            disabled={!!busy}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-olo/30 text-olo font-medium text-sm hover:bg-olo/5 transition-colors disabled:opacity-50"
          >
            {busy === 'enroll' ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Enable 2FA
          </button>
        )}
      </div>

      {/* IP allowlist section */}
      <div className="p-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-olo" />
          </div>
          <div>
            <h3 className="font-heading font-600 text-lg">IP allowlist</h3>
            <p className="text-sm text-muted-foreground">Restrict admin sign-in to specific IP addresses or CIDR ranges. Leave empty to allow all.</p>
          </div>
        </div>

        {!isSuperAdmin && savedAllowlist.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted mb-4">
            <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Only super admins can edit the allowlist. Current rules are shown below.</p>
          </div>
        )}

        <textarea
          value={allowlist}
          onChange={(e) => setAllowlist(e.target.value)}
          disabled={!isSuperAdmin}
          rows={5}
          placeholder={"e.g.\n192.168.1.0/24\n10.0.0.5\n203.0.113.42"}
          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm font-mono focus:outline-none focus:border-olo disabled:opacity-60 disabled:cursor-not-allowed resize-none"
        />
        <p className="text-xs text-muted-foreground mt-2">One IP or CIDR per line (e.g. <code className="font-mono">192.168.1.0/24</code>). Max 50 entries.</p>

        {isSuperAdmin && (
          <button
            onClick={saveAllowlist}
            disabled={busy === 'ip'}
            className="mt-4 inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 disabled:opacity-50"
          >
            {busy === 'ip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save allowlist
          </button>
        )}
      </div>
    </div>
  );
}