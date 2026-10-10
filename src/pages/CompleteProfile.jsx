import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, X, UserCircle, ArrowRight } from 'lucide-react';
import { userProfile } from '@/lib/insforgeDb';
import { useAuth } from '@/lib/AuthContext';
import accountProfile from '@/lib/accountProfile';
import AuthLoading from '@/components/auth/AuthLoading';
import SignupTerms from '@/components/auth/SignupTerms';
import AuthProgress from '@/components/auth/AuthProgress';


// Google Sign-In lands users on a protected page already authenticated, but
// with no teewai username or display name. This step collects both before they
// enter the app — email/password signups set these during register.
function suggestUsername(name, email) {
  const base = (name || (email ? email.split('@')[0] : '') || 'smile')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^[0-9]+/, '')
    .slice(0, 14);
  return base || 'smile';
}

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const googleSignup = new URLSearchParams(window.location.search).get('source') === 'google';
  const [agreed, setAgreed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [me, setMe] = useState(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hasFullName, setHasFullName] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | checking | available | taken | too_short | error
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setError('');
    accountProfile(user).then((u) => {
      if (cancelled) return;
      if (u.username) { navigate('/post-login', { replace: true }); return; }
      setMe(u);
      // If Google provided a full name, skip the name step entirely (Job 1a).
      // The platform stores Google's given_name + family_name as full_name.
      const hasName = !!(u?.full_name && u.full_name.trim());
      setHasFullName(hasName);
      // PRIVACY: never pre-fill the display name with the Google OAuth real
      // name. Leave it empty — the leaderboard falls back to the username the
      // user explicitly chooses below. They can optionally type a display name.
      const suggested = suggestUsername(u?.full_name, u?.email);
      setUsername(suggested);
      setDisplayName(suggested);
    }).catch(() => { if (!cancelled) setError('We couldn’t load your profile. Please try again.'); });
    return () => { cancelled = true; };
  }, [user?.id, loadAttempt]);

  useEffect(() => {
    const u = username.trim().toLowerCase();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!u) { setStatus('idle'); return; }
    if (u.length < 3) { setStatus('too_short'); return; }
    setStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await unrufld.functions.invoke('userProfile', { op: 'checkUsername', username: u });
        setStatus(res.data?.available ? 'available' : 'taken');
      } catch { setStatus('error'); }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username]);

  const canSubmit = status === 'available' && !saving && (!googleSignup || agreed);

  const submit = async () => {
    if (!canSubmit) return;
    setError('');
    setSaving(true);
    try {
      const payload = {
        username: username.trim().toLowerCase(),
        display_name: displayName.trim() || undefined,
      };
      // Only save names if the user was asked for them (Google returned none)
      if (!hasFullName) {
        if (firstName.trim()) payload.first_name = firstName.trim();
        if (lastName.trim()) payload.last_name = lastName.trim();
        if (firstName.trim() || lastName.trim()) {
          payload.full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
        }
      }
      if (googleSignup) {
        payload.terms_accepted = true;
        payload.terms_accepted_at = new Date().toISOString();
      }
      await userProfile.update(payload);
      setSuccess(true);
      navigate('/onboarding', { replace: true });
    } catch (e) {
      setError(e?.message || 'Could not save your profile');
      setSaving(false);
    }
  };

  if (!me) return <AuthLoading label="Preparing your signup…" error={error} onRetry={() => setLoadAttempt((n) => n + 1)} />;

  const feedback = {
    checking: { text: 'Checking…', color: 'text-muted-foreground', icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    too_short: { text: 'At least 3 characters', color: 'text-warning', icon: null },
    available: { text: 'Available', color: 'text-success', icon: <Check className="w-3.5 h-3.5" /> },
    taken: { text: 'Already taken', color: 'text-red-500', icon: <X className="w-3.5 h-3.5" /> },
    error: { text: 'Could not check availability', color: 'text-muted-foreground', icon: null },
    idle: null,
  }[status];

  return (
    <div className="dark relative min-h-screen bg-olo-deep flex flex-col items-center justify-center px-4 py-10 text-white overflow-hidden safe-area-inset-top">
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-olo/25 rounded-full blur-[90px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-olo/15 flex items-center justify-center mx-auto mb-3">
            <UserCircle className="w-7 h-7 text-olo" />
          </div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">
            {googleSignup ? 'Create your teewai profile' : hasFullName ? `Hi, ${me?.full_name?.split(' ')[0] || 'there'}!` : 'Finish your profile'}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {googleSignup ? 'Google verified your email. Choose your username to finish signing up, no new password needed.' : hasFullName
              ? 'Pick a username so friends can find you and send you scans.'
              : 'Tell us your name and pick a username to get started.'}
          </p>
        </div>

        <AuthProgress steps={["Profile", "Done"]} current={success ? 1 : 0} />

        <div className="glass rounded-3xl p-6 space-y-5">
          {error && <div className="p-3 rounded-lg bg-destructive/20 text-destructive text-sm text-center">{error}</div>}

          {/* Name fields — only when Google didn't provide a name (Job 1a) */}
          {!hasFullName && (
            <div className="grid grid-cols-2 gap-3 auth-step-enter">
              <div className="space-y-2">
                <Label htmlFor="cp-first">First name</Label>
                <Input
                  id="cp-first"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ada"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-last">Last name</Label>
                <Input
                  id="cp-last"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Okafor"
                  className="h-12 text-base"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cp-username">Username</Label>
            <Input
              id="cp-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
            />
            {feedback && (
              <div className={`flex items-center gap-1.5 text-xs ${feedback.color}`}>
                {feedback.icon}
                <span>{feedback.text}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-display">Display name</Label>
            <Input
              id="cp-display"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name (optional)"
            />
            <p className="text-xs text-muted-foreground">Shows on the leaderboard — keep it different from your real first/last name. It defaults to your username; you can keep it the same or pick a different one.</p>
          </div>

          {googleSignup && <SignupTerms checked={agreed} onChange={setAgreed} />}
          <Button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="w-full h-12 font-medium bg-olo text-white hover:bg-olo/90"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
            {saving ? 'Saving…' : 'Continue'}
          </Button>
        </div>
      </div>

    </div>
  );
}