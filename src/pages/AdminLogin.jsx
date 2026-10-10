import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuth } from '@/lib/adminAuth';
import BackButton from '@/components/BackButton';
import { ShieldCheck, Loader2, ArrowLeft, KeyRound, Copy, Check, Timer } from 'lucide-react';

export default function AdminLogin({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Enforced 2FA enrollment flow (first login or after 2FA was reset)
  const [enrollmentMode, setEnrollmentMode] = useState(false);
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);

  // Live countdown so the admin sees exactly when they can retry after being
  // rate-limited, instead of a static "try again later" message.
  useEffect(() => {
    if (retrySeconds <= 0) return;
    const t = setInterval(() => {
      setRetrySeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [retrySeconds]);

  const formatRetry = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminAuth.login(username.trim(), password, totpCode || undefined);
      if (data?.totp_required) {
        setTotpRequired(true);
        setTotpCode('');
        return;
      }
      if (data?.totp_enrollment_required) {
        // 2FA is mandatory — enroll before a session token is issued.
        setEnrollmentToken(data.enrollment_token);
        setEnrollmentMode(true);
        const enrollData = await adminAuth.enrollTotpEnrollment(data.enrollment_token);
        setEnrollmentData(enrollData);
        return;
      }
      onLogin();
    } catch (err) {
      const msg = err?.message || '';
      // Rate-limited (429): the backend returns retry_after_seconds so we can
      // show a live countdown instead of a vague message.
      if (err?.retry_after_seconds) {
        setRetrySeconds(err.retry_after_seconds);
        setError('Too many failed attempts. Please wait before retrying.');
      } else if (totpRequired) {
        setError(msg.includes('401') || msg.includes('failed with status') ? 'Invalid verification code' : (msg || 'Invalid verification code'));
      } else {
        setError(msg.includes('401') || msg.includes('failed with status') ? 'Invalid username or password' : (msg || 'Invalid credentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmEnrollment = async (e) => {
    e.preventDefault();
    setError('');
    if (enrollmentCode.length !== 6) { setError('Enter the 6-digit code from your authenticator app'); return; }
    setLoading(true);
    try {
      await adminAuth.confirmTotpEnrollment(enrollmentToken, enrollmentCode.trim());
      onLogin();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.includes('failed with status')) {
        setError('Invalid verification code. Make sure you copied the secret correctly into your authenticator app, and try a fresh code.');
      } else {
        setError(msg || 'Invalid verification code');
      }
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetEnrollment = () => {
    setEnrollmentMode(false);
    setEnrollmentToken('');
    setEnrollmentData(null);
    setEnrollmentCode('');
    setError('');
    setTotpRequired(false);
    setTotpCode('');
  };

  return (
    <div className="min-h-screen bg-olo-deep flex items-center justify-center px-4 py-8 safe-area-inset-top">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 text-white">
          <div className="w-14 h-14 rounded-2xl bg-olo/20 flex items-center justify-center mx-auto mb-4 olo-glow">
            <ShieldCheck className="w-7 h-7 text-olo" />
          </div>
          <h1 className="font-heading font-700 text-2xl">Admin sign in</h1>
          <p className="text-white/50 text-sm mt-1">
            {enrollmentMode ? 'Set up 2FA to continue' : 'Authorized access only'}
          </p>
        </div>

        {enrollmentMode ? (
          <form onSubmit={confirmEnrollment} className="bg-card rounded-3xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-olo/5 border border-olo/20">
              <KeyRound className="w-4 h-4 text-olo flex-shrink-0" />
              <p className="text-xs text-muted-foreground">2FA is required for all admin accounts. Set up your authenticator app to continue.</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">1. Add to your authenticator app</p>
              <p className="text-xs text-muted-foreground mb-2">Enter this secret key manually:</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background border border-border font-mono text-sm break-all">
                <code className="flex-1">{enrollmentData?.secret}</code>
                <button type="button" onClick={copySecret} className="text-muted-foreground hover:text-olo flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">2. Enter the 6-digit code from your app</p>
              <input
                value={enrollmentCode}
                onChange={(e) => setEnrollmentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
                inputMode="numeric"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono tracking-widest focus:outline-none focus:border-olo"
                placeholder="000000"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || enrollmentCode.length !== 6}
              className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-xl hover:scale-[1.01] transition-transform olo-glow disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Activate & sign in
            </button>
            <button
              type="button"
              onClick={resetEnrollment}
              className="block w-full text-center text-xs text-muted-foreground hover:text-olo transition-colors"
            >
              <ArrowLeft className="w-3 h-3 inline mr-1" /> Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="bg-card rounded-3xl border border-border p-6 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus={!totpRequired}
                disabled={totpRequired}
                autoComplete="username"
                maxLength={64}
                spellCheck={false}
                autoCapitalize="none"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo disabled:opacity-60"
                placeholder="username"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={totpRequired}
                autoComplete="current-password"
                maxLength={128}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>
            {totpRequired && (
              <div className="animate-fade-up">
                <label className="text-xs text-muted-foreground">Verification code (2FA)</label>
                <input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  inputMode="numeric"
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono tracking-widest focus:outline-none focus:border-olo"
                  placeholder="000000"
                />
                <p className="text-xs text-muted-foreground mt-1.5">Enter the 6-digit code from your authenticator app.</p>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {retrySeconds > 0 && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <Timer className="w-4 h-4" />
                <p className="text-sm font-medium">Try again in {formatRetry(retrySeconds)}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || retrySeconds > 0}
              className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-xl hover:scale-[1.01] transition-transform olo-glow disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {totpRequired ? 'Verify & sign in' : 'Sign in'}
            </button>
            {totpRequired && (
              <button
                type="button"
                onClick={() => { setTotpRequired(false); setTotpCode(''); setError(''); }}
                className="block w-full text-center text-xs text-muted-foreground hover:text-olo transition-colors"
              >
                <ArrowLeft className="w-3 h-3 inline mr-1" /> Back to sign in
              </button>
            )}
            {!totpRequired && (
              <BackButton compact className="text-xs pt-1" />
            )}
          </form>
        )}
      </div>
    </div>
  );
}