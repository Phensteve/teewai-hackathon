import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { unrufld } from '@/api/unrufldClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Loader2, AtSign, ArrowRight, ArrowLeft, Check, X, AlertCircle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import RegisterSessionGate from '@/components/auth/RegisterSessionGate';
import BackButton from '@/components/BackButton';
import { authPageLink, rememberAuthDestination } from '@/lib/authNavigation';
import ExistingAccountNotice from '@/components/auth/ExistingAccountNotice';
import { beginGoogleAuth, googleAuthError, isExistingAccountError } from '@/lib/googleAuthFlow';
import GoogleIcon from "@/components/GoogleIcon";

import { userProfile } from "@/lib/insforgeDb";
import { toast } from "@/components/ui/use-toast";
import { isNativeApp } from "@/lib/isNativeApp";
import AuthProgress from "@/components/auth/AuthProgress";
import AuthCelebration from "@/components/auth/AuthCelebration";

import PasswordField from "@/components/auth/PasswordField";
import { storePendingReferralCode, getPendingReferralCode, extractReferralCodeFromURL } from "@/lib/referral";
import { pendingInvitation, influencerCall, claimInvitation } from '@/lib/influencers';
import InvitationCodeInput from '@/components/influencers/InvitationCodeInput';

const HOW_FOUND_OPTIONS = [
  { value: "friend", label: "Friend or family" },
  { value: "social", label: "Social media" },
  { value: "search", label: "Google search" },
  { value: "dentist", label: "My dentist" },
  { value: "app_store", label: "App store" },
  { value: "from_owner", label: "From the owner" },
  { value: "other", label: "Other" },
];

// 0 = too short (<8), 1 = weak, 2 = fair, 3 = strong. Strength is informational
// only — the hard rules are: minimum 8 characters + not in breached password list.
function passwordStrength(pw) {
  if (!pw || pw.length < 8) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 2) return 1;
  if (score === 3) return 2;
  return 3;
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Strong"];
const STRENGTH_COLORS = ["bg-muted-foreground/30", "bg-danger", "bg-warning", "bg-success"];

export default function Register() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("idle"); // idle | checking | too_short | available | taken | error
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [howFound, setHowFound] = useState("");
  const step4Entered = useRef(0);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);
  const [resending, setResending] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [showAppeal, setShowAppeal] = useState(false);
  const [referralCode, setReferralCode] = useState(() => {
    try {
      // Priority: URL ?ref= param → localStorage (survives OTP flow) → empty.
      const fromURL = extractReferralCodeFromURL();
      if (fromURL) { storePendingReferralCode(fromURL); return fromURL; }
      return getPendingReferralCode();
    } catch { return ""; }
  });
  const [referrerUsername, setReferrerUsername] = useState("");
  const [invitationCode, setInvitationCode] = useState(() => pendingInvitation());

  // Look up the referrer's username when a referral code is present.
  useEffect(() => {
    if (!referralCode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await unrufld.functions.invoke("userProfile", { op: "resolveReferrer", code: referralCode });
        if (!cancelled && res.data?.valid && res.data?.username) {
          setReferrerUsername(res.data.username);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [referralCode]);

  // Debounced username uniqueness check against existing users.
  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (!value) { setUsernameStatus("idle"); return; }
    if (value.length < 3) { setUsernameStatus("too_short"); return; }
    setUsernameStatus("checking");
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await unrufld.functions.invoke("userProfile", { op: "checkUsername", username: value });
        if (cancelled) return;
        if (res.data?.available) setUsernameStatus("available");
        else if (res.data?.reason === "too_short") setUsernameStatus("too_short");
        else setUsernameStatus("taken");
      } catch {
        if (!cancelled) setUsernameStatus("error");
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
  }, [username]);

  const strength = passwordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const emailStepValid = !!email && emailValid;
  const passwordStepValid = password.length >= 8 && passwordsMatch;
  const step1Valid = emailStepValid && passwordStepValid;
  const usernameValid = username.trim().length >= 3 && usernameStatus === "available";

  const next = () => {
    setError("");
    if (step === 1) {
      if (!email) return setError("Enter your email");
      if (!emailValid) return setError("Enter a valid email address");
      setStep(2);
    } else if (step === 2) {
      if (password.length < 8) return setError("Password must be at least 8 characters");
      if (!passwordsMatch) return setError("Passwords do not match");
      setStep(3);
    } else if (step === 3) {
      if (!usernameValid) return setError("Pick an available username (3+ characters)");
      step4Entered.current = Date.now();
      setStep(4);
    }
  };
  const back = () => { setError(""); setStep((s) => Math.max(1, s - 1)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setError("");
    setBlocked(false);
    // Ignore a submit that fires the instant step 3 mounts — keyboard Enter
    // auto-repeat (or a fast double-click on "Next") would otherwise skip the
    // first/last-name step straight to email verification.
    if (step !== 4 || Date.now() - step4Entered.current < 300) return;
    if (!step1Valid || !usernameValid) return;
    if (!agreed) { setTermsError("Please agree to the Terms & Conditions and Privacy Policy to continue"); return; }
    rememberAuthDestination();
    setLoading(true);
    try {
      // Breached password check — NIST 800-63B Rev 4 §5.1.1.2 requires screening
      // against commonly-used / compromised passwords. Blocks "password123" etc.
      try {
        const pwCheck = await unrufld.functions.invoke("userAuth", { op: "checkPassword", password });
        if (pwCheck.data && !pwCheck.data.valid) {
          const reasons = {
            too_short: "Password must be at least 8 characters",
            breached: "This password is in a known breach list. Choose something more unique.",
            pattern: "Avoid sequential or repeating patterns (1234, abcd, aaaa).",
          };
          setError(reasons[pwCheck.data.reason] || "Choose a stronger password");
          setLoading(false);
          return;
        }
      } catch {}
      // Disposable email check — block temp email domains (bypasses IP abuse prevention)
      try {
        const emailCheck = await unrufld.functions.invoke("userAuth", { op: "checkEmail", email });
        if (emailCheck.data?.disposable) {
          setError("Please use a permanent email address. Disposable email domains are not allowed.");
          setLoading(false);
          return;
        }
      } catch {}
      // IP-based abuse prevention: block if 3+ free accounts from this network
      try {
        const { getDeviceFingerprint } = await import("@/lib/deviceFingerprint");
        const device_hash = await getDeviceFingerprint().catch(() => "");
        const checkRes = await unrufld.functions.invoke("checkIpRegistration", { device_hash });
        if (checkRes.data && !checkRes.data.allowed) {
          setError(checkRes.data.reason || "Registration blocked. Please contact support.");
          setBlocked(true);
          setBlockReason(checkRes.data.reason || "Too many free accounts from your network.");
          toast({
            variant: "destructive",
            title: "Registration blocked",
            description: "Too many free accounts from your network. Upgrade an existing account or contact support.",
          });
          return;
        }
      } catch {
        // Fail open — don't block if the check itself errors
      }
      if (invitationCode) await influencerCall('validate', { code: invitationCode });
      await unrufld.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      if (isExistingAccountError(err)) setExistingAccount(true);
      else setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (loading || otpCode.length !== 6 || verified) return;
    setError("");
    setLoading(true);
    try {
      // OTP rate limit check — prevents brute-forcing the 6-digit code
      try {
        const rl = await unrufld.functions.invoke("userAuth", { op: "checkRate", type: "otp", key: email });
        if (rl.data?.blocked) {
          const mins = Math.ceil((rl.data.retryAfter || 600) / 60);
          setError(`Too many verification attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`);
          setLoading(false);
          return;
        }
      } catch {}
      const result = await unrufld.auth.verifyOtp({ email, otpCode });
      if (!result?.access_token) throw new Error('Verification could not finish. Please try again.');
      unrufld.auth.setToken(result.access_token);
      sessionStorage.setItem('teewai_just_logged_in', '1');
      await claimInvitation().catch(() => {});
      // Persist the profile fields collected during signup.
      try {
        await userProfile.update({
          username: username.trim().toLowerCase(),
          display_name: username.trim().toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          how_found: howFound || undefined,
        });
      } catch {}
      // Send the branded welcome email (registered users only). Fire-and-forget.
      unrufld.functions.invoke("sendWelcomeEmail", {
        email,
        name: firstName.trim() || username.trim(),
      }).catch(() => {});
      // Log the registration IP for abuse prevention
      import("@/lib/deviceFingerprint")
        .then(({ getDeviceFingerprint }) => getDeviceFingerprint().catch(() => ""))
        .then((device_hash) => unrufld.functions.invoke("logIpRegistration", {
          username: username.trim().toLowerCase(),
          device_hash,
        }))
        .catch(() => {});
      // Create referral record if a code was entered
      try {
        const me = await unrufld.auth.me();
        if (me?.id) {
          const { createReferralFromStoredCode } = await import("@/lib/referral");
          await createReferralFromStoredCode(me);
        }
      } catch {}
      // Confirm success on screen before redirecting into the app.
      setVerified(true);
      // AuthCelebration auto-redirects after 2s, or user taps "Continue"
      return;
    } catch (err) {
      setError(err.message || "Invalid verification code");
      setOtpCode("");
      unrufld.functions.invoke("userAuth", { op: "logAttempt", type: "otp", key: email }).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || loading || verified) return;
    setResending(true);
    setError("");
    // Rate limit OTP resend — prevents email bombing (OWASP Forgot Password Cheat Sheet)
    try {
      const rl = await unrufld.functions.invoke("userAuth", { op: "checkRate", type: "resend", key: email });
      if (rl.data?.blocked) {
        const mins = Math.ceil((rl.data.retryAfter || 600) / 60);
        setError(`Too many resend requests. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`);
        setResending(false);
        return;
      }
    } catch {}
    try {
      await unrufld.auth.resendOtp(email);
      unrufld.functions.invoke("userAuth", { op: "logAttempt", type: "resend", key: email }).catch(() => {});
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  if (existingAccount) return <RegisterSessionGate><ExistingAccountNotice email={email} onBack={() => { setExistingAccount(false); setEmail(''); setPassword(''); setConfirmPassword(''); setStep(1); }} /></RegisterSessionGate>;

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title="Verify your email" subtitle={`We sent a code to ${email}`}>
        {error && (<div className="mb-3 sm:mb-4 p-3 rounded-lg bg-danger-soft border border-danger/20 flex items-start gap-2.5"><AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" /><p className="text-sm text-danger">{error}</p></div>)}
        <div className="flex justify-center mb-4 sm:mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} className="text-base h-12 w-12 sm:h-14 sm:w-14 text-lg" /><InputOTPSlot index={1} className="text-base h-12 w-12 sm:h-14 sm:w-14 text-lg" /><InputOTPSlot index={2} className="text-base h-12 w-12 sm:h-14 sm:w-14 text-lg" />
              <InputOTPSlot index={3} className="text-base h-12 w-12 sm:h-14 sm:w-14 text-lg" /><InputOTPSlot index={4} className="text-base h-12 w-12 sm:h-14 sm:w-14 text-lg" /><InputOTPSlot index={5} className="text-base h-12 w-12 sm:h-14 sm:w-14 text-lg" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-11 sm:h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify"}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-3 sm:mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} disabled={resending || loading || verified} className="text-primary font-medium hover:underline disabled:opacity-50">{resending ? 'Sending…' : 'Resend'}</button>
        </p>
        {verified && (
          <AuthCelebration
            title={`Welcome to teewai${firstName.trim() ? `, ${firstName.trim()}` : ""}!`}
            subtitle="Your account is ready. Let's set up your smile profile."
            ctaLabel="Continue"
            onCTA={() => { window.location.replace('/onboarding'); }}
            autoDismiss={true}
            variant="signup"
          />
        )}
      </AuthLayout>
    );
  }

  const usernameFeedback = {
    checking: { text: "Checking…", color: "text-muted-foreground", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    too_short: { text: "At least 3 characters", color: "text-warning", icon: null },
    available: { text: "Available", color: "text-success", icon: <Check className="w-3.5 h-3.5" /> },
    taken: { text: "Already taken", color: "text-red-500", icon: <X className="w-3.5 h-3.5" /> },
    error: { text: "Could not check availability", color: "text-muted-foreground", icon: null },
    idle: null,
  }[usernameStatus];

  return (
    <RegisterSessionGate>
    <AuthLayout
      icon={UserPlus}
      title="Create your teewai account"
      subtitle="Sign up to start your whitening journey"
      footer={
        <>
          Already have an account?{" "}
          <Link to={authPageLink('/login')} replace className="text-primary font-medium hover:underline">Log in</Link>
        </>
      }
    >
      {!isNativeApp() && <BackButton compact className="mb-4" />}

      {referrerUsername && (
        <div className="mb-4 p-3 rounded-xl bg-olo/10 border border-olo/20 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-olo flex items-center justify-center flex-shrink-0">
            <AtSign className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm text-foreground">
            <span className="font-semibold">@{referrerUsername}</span> has invited you to join teewai
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={loading || googleLoading}
        onClick={async () => {
          setGoogleLoading(true);
          setError('');
          try {
            if (invitationCode) await influencerCall('validate', { code: invitationCode });
            await beginGoogleAuth('signup');
          } catch (err) {
            if (isExistingAccountError(err)) setExistingAccount(true);
            else setError(googleAuthError(err));
            setGoogleLoading(false);
          }
        }}
        className="flex items-center justify-center gap-2 w-full h-11 sm:h-12 px-4 rounded-xl border border-border bg-transparent hover:bg-muted/40 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3 active:scale-[0.98]"
      >
        {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon className="w-5 h-5" />}
        {googleLoading ? 'Opening Google…' : 'Continue with Google'}
      </button>

      <InvitationCodeInput value={invitationCode} onChange={setInvitationCode} />

      {/* Referral code — visible to ALL users (Google and email/password).
          Stored in localStorage on change so it survives the Google OAuth redirect. */}
      <div className="space-y-1.5 mb-3">
        <Label htmlFor="referralCodeTop">Referral code <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></Label>
        <Input
          id="referralCodeTop"
          type="text"
          inputMode="numeric"
          placeholder="1234"
          value={referralCode}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setReferralCode(v); storePendingReferralCode(v); }}
          className="h-11 sm:h-12 text-base tracking-wider"
        />
      </div>

      <div className="relative mb-4 sm:mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">or</span></div>
      </div>

      <AuthProgress
        steps={["Email", "Password", "Username", "About you", "Verify", "Done"]}
        current={showOtp ? (verified ? 5 : 4) : step - 1}
      />

      {error && (<div className="mb-3 sm:mb-4 p-3 rounded-lg bg-danger-soft border border-danger/20 flex items-start gap-2.5"><AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" /><p className="text-sm text-danger">{error}</p></div>)}
      {blocked && (
        <div className="mb-3 sm:mb-4">
          <button type="button" onClick={() => setShowAppeal(true)} className="text-xs font-medium text-olo hover:underline">
            Believe this is a mistake? Appeal this decision →
          </button>
        </div>
      )}

      <form onSubmit={(e) => (step === 4 ? handleSubmit(e) : (e.preventDefault(), next()))} className="space-y-3 sm:space-y-4">
        {/* Step 1 — email */}
        {step === 1 && (
          <div key="step1" className="space-y-3 sm:space-y-4 auth-step-enter">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setEmailTouched(true)} className={`pl-10 h-11 sm:h-12 text-base ${emailTouched && !emailValid && email ? "border-destructive" : ""}`} required />
                {emailTouched && emailValid && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" aria-hidden="true" />
                )}
                {emailTouched && email && !emailValid && (
                  <p className="text-xs text-destructive mt-1">Enter a valid email address</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — password */}
        {step === 2 && (
          <div key="step2" className="space-y-3 sm:space-y-4 auth-step-enter">
            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              hint={password.length > 0 && (
                <div>
                  <div className="flex gap-1.5 mt-1.5">
                    {[1, 2, 3].map((lvl) => (
                      <div key={lvl} className={`h-1.5 flex-1 rounded-full transition-colors ${strength >= lvl ? STRENGTH_COLORS[strength] : "bg-muted"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{STRENGTH_LABELS[strength]} · min 8 characters</p>
                </div>
              )}
            />
            <PasswordField
              id="confirm"
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              hint={confirmPassword.length > 0 && (
                <p className={`text-xs ${passwordsMatch ? "text-success" : "text-danger"}`}>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</p>
              )}
            />
          </div>
        )}

        {/* Step 3 — unique username (compulsory) */}
        {step === 3 && (
          <div key="step3" className="space-y-3 sm:space-y-4 auth-step-enter">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="username">Username</Label>
                  <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-wide">Not optional</span>
                </div>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    placeholder="yourname"
                    value={username}
                    onChange={(e) => { const value = e.target.value.replace(/\s+/g, ''); if (value !== username) { setUsernameStatus('checking'); setUsername(value); } }}
                    className="pl-10 h-11 sm:h-12 text-base"
                  />
                </div>
                {usernameFeedback && (
                  <p className={`text-xs flex items-center gap-1.5 ${usernameFeedback.color}`}>
                    {usernameFeedback.icon}{usernameFeedback.text}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Your unique handle on teewai. 3+ characters, no spaces.</p>
                <p className="text-xs text-muted-foreground/80">Your display name will match your username by default — you can change it anytime in your profile.</p>
                </div>
                </div>
                )}

                {/* Step 4 — about you (optional, editable later) */}
                {step === 4 && (
                <div key="step4" className="space-y-3 sm:space-y-4 auth-step-enter">
                <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="usernameConfirm">Username</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="usernameConfirm" type="text" value={username} readOnly className="pl-10 h-11 sm:h-12 text-base bg-muted/40 text-muted-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="firstName">First name <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></Label>
                  <Input id="firstName" type="text" autoComplete="given-name" placeholder="Ada" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11 sm:h-12 text-base" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="lastName">Last name <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></Label>
                  <Input id="lastName" type="text" autoComplete="family-name" placeholder="Okafor" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11 sm:h-12 text-base" />
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="howFound">How did you find out about us? <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></Label>
                <select
                  id="howFound"
                  value={howFound}
                  onChange={(e) => setHowFound(e.target.value)}
                  className="h-11 sm:h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
                >
                  <option value="">Select…</option>
                  {HOW_FOUND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">You can update all of this anytime in the app.</p>
                </div>
                <div className="pt-1">
                  <label className="flex items-start gap-3 cursor-pointer select-none min-h-[44px] py-2.5 rounded-lg">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setTermsError(""); }}
                      className="mt-0.5 w-5 h-5 rounded border-border accent-[#0d9f8e] cursor-pointer flex-shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      I agree to the{" "}
                      <Link to="/terms" target="_blank" className="text-primary font-medium hover:underline">Terms &amp; Conditions</Link>{" "}
                      and{" "}
                      <Link to="/privacy" target="_blank" className="text-primary font-medium hover:underline">Privacy Policy</Link>
                    </span>
                  </label>
                  {termsError && (
                    <p className="text-xs text-destructive mt-1">{termsError}</p>
                  )}
                </div>
                </div>
                )}

                {/* Navigation */}
        <div className="flex gap-3 pt-1 sm:pt-2">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={back} className="h-11 sm:h-12">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          {step < 4 ? (
            <Button type="button" onClick={next} disabled={(step === 1 && !emailStepValid) || (step === 2 && !passwordStepValid) || (step === 3 && !usernameValid)} className="flex-1 h-11 sm:h-12 font-medium">
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={loading || googleLoading} className="flex-1 h-11 sm:h-12 font-medium">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : "Create account"}
            </Button>
          )}
        </div>
      </form>
      {showAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center">
            <p className="font-heading text-base font-700">Sign-up blocked</p>
            <p className="mt-2 text-sm text-muted-foreground">{blockReason}</p>
            <button
              type="button"
              onClick={() => setShowAppeal(false)}
              className="mt-4 rounded-xl bg-olo px-5 py-2 text-sm font-semibold text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
    </RegisterSessionGate>
  );
}