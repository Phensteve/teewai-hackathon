import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { unrufld } from '@/api/unrufldClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, ArrowLeft, Check, AlertCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import PasswordField from "@/components/auth/PasswordField";
import { authPageLink, rememberAuthDestination } from '@/lib/authNavigation';
import BackButton from '@/components/BackButton';
import LoginSessionGate from '@/components/auth/LoginSessionGate';
import loginAccountChecks from '@/lib/loginAccountChecks';
import { beginGoogleAuth, googleAuthError } from '@/lib/googleAuthFlow';
import { isNativeApp } from "@/lib/isNativeApp";

// Unified sign-in — one form for everyone. teewai accounts can be both patient
// and dentist, so a role choice at login is friction AND wrong for dual-role
// accounts (credentials are identical). After auth, the post-login resolver
// reads the account's actual roles and routes accordingly.
export default function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mustReset, setMustReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailValid, setEmailValid] = useState(false);

  // Email/username inline validation on blur — green check when valid, no
  // harsh error text (the submit handler gives specific errors on failure).
  const validateEmail = (val) => {
    const v = val.trim();
    if (!v) { setEmailValid(false); return; }
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
    const isUsername = v.length >= 3 && !v.includes("@");
    setEmailValid(isEmail || isUsername);
  };

  // Stash the original deep link in sessionStorage and point the SDK at the
  // post-login resolver. The resolver reads the account's actual roles (only
  // known after auth) and routes accordingly — no role choice needed here.
  const stashReturnTo = () => rememberAuthDestination();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setError("");
    setLoading(true);
    try {
      const id = email.trim();
      const rateLimitKey = id.toLowerCase();
      const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id);

      // Rate limit check — prevents brute-force attacks (OWASP A07:2025)
      try {
        const rl = await unrufld.functions.invoke("userAuth", { op: "checkRate", type: "login", key: rateLimitKey });
        if (rl.data?.blocked) {
          const mins = Math.ceil((rl.data.retryAfter || 900) / 60);
          setError(`Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`);
          setLoading(false);
          return;
        }
      } catch {}

      let loginEmail = id;
      if (!isEmail) {
        // Login by username: resolve the handle to the account email, then
        // sign in with email + password (Base44 auth is email-based).
        try {
          const res = await unrufld.functions.invoke("userProfile", { op: "resolveUsername", username: id.toLowerCase() });
          if (!res.data?.email) {
            // Don't reveal that the username doesn't exist — generic error
            setError("Invalid email or password");
            unrufld.functions.invoke("userAuth", { op: "logAttempt", type: "login", key: rateLimitKey }).catch(() => {});
            setLoading(false);
            return;
          }
          loginEmail = res.data.email;
        } catch {
          setError("Invalid email or password");
          unrufld.functions.invoke("userAuth", { op: "logAttempt", type: "login", key: rateLimitKey }).catch(() => {});
          setLoading(false);
          return;
        }
      }
      // Preserve both account safeguards without two serial network waits.
      const accountCheck = await loginAccountChecks(loginEmail);
      if (accountCheck.status === 'deleted') { setError('This account has been deleted. Contact support to restore it.'); setLoading(false); return; }
      if (accountCheck.status === 'suspended') { setError('This account has been suspended. Contact support if you think this is a mistake.'); setLoading(false); return; }

      stashReturnTo();

      // Force-reset gate: existing users (created before the cutoff) must set
      // a fresh password at their next password login. This check runs BEFORE
      // loginViaEmailPassword because that method hard-redirects the browser,
      // making any post-login check dead code. Google logins never reach here
      // (they use loginWithProvider), so Google-only users are exempt.
      try {
        if (accountCheck.mustReset) {
          setResetEmail(loginEmail);
          try { await unrufld.auth.resetPasswordRequest(loginEmail); } catch {}
          setMustReset(true);
          setLoading(false);
          return;
        }
        if (accountCheck.justReset) localStorage.removeItem("teewai_just_reset");
      } catch {}

      sessionStorage.setItem('teewai_just_logged_in', '1');
      await unrufld.auth.loginViaEmailPassword(loginEmail, password);

      // Clear rate limit attempts on successful login
      unrufld.functions.invoke("userAuth", { op: "clearAttempts", type: "login", key: rateLimitKey }).catch(() => {});
      // Reinitialize the session immediately; no artificial success delay.
      window.location.replace('/post-login');
    } catch (err) {
      setError(err.message || "Invalid email or password");
      // Keep the entered credentials so the user can correct them.
      // Log failed attempt to the rate limiter
      unrufld.functions.invoke("userAuth", { op: "logAttempt", type: "login", key: email.trim().toLowerCase() }).catch(() => {});
      setLoading(false);
    }
  };

  if (mustReset) {
    return (
      <AuthLayout
        icon={Lock}
        title="Reset your password"
        subtitle="For your security, please set a new password"
      >
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6 text-olo" />
          </div>
          <p className="text-sm text-muted-foreground">
            We've sent a password reset link to <strong className="text-foreground">{resetEmail}</strong>. Open it and set a new password, then sign in again.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn't get it? Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => unrufld.auth.resetPasswordRequest(resetEmail).catch(() => {})}
              className="text-olo font-medium hover:underline"
            >
              resend it
            </button>.
          </p>
          <button type="button" onClick={() => setMustReset(false)} className="text-xs text-muted-foreground hover:text-foreground inline-block pt-1">Back to login</button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <LoginSessionGate>
    <AuthLayout
      icon={LogIn}
      title="Sign in to teewai"
      subtitle="Welcome back! Enter your credentials to access your account"
    >
      {!isNativeApp() && <BackButton compact className="mb-4" />}

      <button
        type="button"
        disabled={loading || googleLoading}
        onClick={async () => {
          setError('');
          setGoogleLoading(true);
          try {
            await beginGoogleAuth('signin');
          } catch (err) {
            setError(googleAuthError(err));
            setGoogleLoading(false);
          }
        }}
        className="flex items-center justify-center gap-2 w-full h-11 sm:h-12 px-4 rounded-xl border border-border bg-transparent hover:bg-muted/40 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3 active:scale-[0.98]"
      >
        {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon className="w-5 h-5" />}
        {googleLoading ? 'Opening Google…' : 'Continue with Google'}
      </button>

      <div className="relative mb-4 sm:mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>



      {error && (
        <div className="mb-3 sm:mb-4 p-3 rounded-lg bg-danger-soft border border-danger/20 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="email">Email or username</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="text"
              autoComplete="username"
              autoFocus
              placeholder="you@example.com or yourname"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailTouched) validateEmail(e.target.value); }}
              onBlur={(e) => { setEmailTouched(true); validateEmail(e.target.value); }}
              className="pl-10 h-11 sm:h-12 text-base"
              required
            />
            {emailTouched && emailValid && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" aria-hidden="true" />
            )}
          </div>
        </div>
        <PasswordField
          id="password"
          label="Password"
          labelExtra={<Link to={authPageLink('/forgot-password')} replace className="text-xs text-primary hover:underline">Forgot password?</Link>}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <Button type="submit" className="w-full h-11 sm:h-12 font-medium" disabled={loading || googleLoading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-3 sm:mt-4">
        Don't have an account?{" "}
        <Link to={authPageLink('/register')} replace className="text-primary font-medium hover:underline">
          Create one
        </Link>
      </p>


    </AuthLayout>
    </LoginSessionGate>
  );
}