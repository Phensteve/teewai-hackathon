import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, UserPlus, Check, AlertCircle, Mail } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';

// Create a username + password login for a child, tied to the parent's email
// via plus-addressing. The child signs in with their username — no email
// needed. The OTP goes to the parent's inbox.
//
// Flow:
//   1. Parent enters child's name, username, password
//   2. We call childAuth.initCreate → get synthetic email
//   3. We call unrufld.auth.register → sends OTP to parent
//   4. Parent enters OTP → unrufld.auth.verifyOtp (no setToken — parent stays logged in)
//   5. We call childAuth.completeCreate → sets username, links to family slot
export default function CreateChildDialog({ open, onClose, memberIndex, memberName, onCreated }) {
  const [step, setStep] = useState(1); // 1=form, 2=otp, 3=success
  const [name, setName] = useState(memberName || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [syntheticEmail, setSyntheticEmail] = useState('');

  // Reset when the dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setName(memberName || '');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setError('');
      setSyntheticEmail('');
    }
  }, [open, memberName]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    if (!name.trim()) return setError("Enter your child's name");
    if (username.trim().length < 3) return setError('Username must be at least 3 characters');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    try {
      // Check password strength
      const pwCheck = await unrufld.functions.invoke('userAuth', { op: 'checkPassword', password });
      if (pwCheck.data && !pwCheck.data.valid) {
        const reasons = {
          too_short: 'Password must be at least 8 characters',
          breached: 'This password is in a known breach list. Choose something more unique.',
          pattern: 'Avoid sequential or repeating patterns (1234, abcd, aaaa).',
        };
        setError(reasons[pwCheck.data.reason] || 'Choose a stronger password');
        setLoading(false);
        return;
      }

      // Init: check username, get synthetic email
      const initRes = await unrufld.functions.invoke('childAuth', {
        op: 'initCreate',
        username: username.trim().toLowerCase(),
        name: name.trim(),
        member_index: memberIndex,
      });
      if (initRes.data?.error) throw new Error(initRes.data.error);
      const synthEmail = initRes.data.synthetic_email;
      setSyntheticEmail(synthEmail);

      // Register if the account doesn't exist yet
      if (!initRes.data.exists) {
        try {
          await unrufld.auth.register({ email: synthEmail, password });
        } catch (err) {
          // If the email already exists, skip to OTP (previous attempt)
          const msg = (err.message || '').toLowerCase();
          if (!msg.includes('already') && !msg.includes('exists')) throw err;
        }
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Could not create the account');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    if (otpCode.trim().length < 6) return setError('Enter the 6-digit code');
    setLoading(true);
    try {
      // Verify OTP — do NOT call setToken (parent stays logged in)
      await unrufld.auth.verifyOtp({ email: syntheticEmail, otpCode: otpCode.trim() });

      // Complete: set username and link to family plan
      const completeRes = await unrufld.functions.invoke('childAuth', {
        op: 'completeCreate',
        synthetic_email: syntheticEmail,
        username: username.trim().toLowerCase(),
        name: name.trim(),
        member_index: memberIndex,
      });
      if (completeRes.data?.error) throw new Error(completeRes.data.error);
      setStep(3);
      if (onCreated) onCreated(completeRes.data.members);
    } catch (err) {
      setError(err.message || 'Invalid verification code');
      unrufld.functions.invoke('userAuth', { op: 'logAttempt', type: 'otp', key: syntheticEmail }).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await unrufld.auth.resendOtp(syntheticEmail);
    } catch {
      setError('Could not resend the code');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-olo" />
                Create a login for your child
              </DialogTitle>
              <DialogDescription>
                Your child signs in with their username and password — no email needed. The verification code goes to your inbox.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 text-sm text-danger flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="kid-name">Child's name</Label>
                <Input id="kid-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emma" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kid-username">Username</Label>
                <Input id="kid-username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="e.g. emma" autoCapitalize="none" />
                <p className="text-xs text-muted-foreground">At least 3 characters. This is what your child types to sign in.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kid-password">Password</Label>
                <Input id="kid-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kid-confirm">Confirm password</Label>
                <Input id="kid-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</> : <><UserPlus className="w-4 h-4 mr-2" /> Create account</>}
              </Button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-olo" />
                Enter the verification code
              </DialogTitle>
              <DialogDescription>
                We sent a 6-digit code to your email. Enter it below to activate your child's account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 text-sm text-danger flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={handleVerify} disabled={loading || otpCode.length < 6} className="w-full h-11">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</> : <><Check className="w-4 h-4 mr-2" /> Verify & finish</>}
              </Button>
              <button onClick={handleResend} className="w-full text-xs text-muted-foreground hover:text-olo text-center">
                Didn't get it? Resend the code
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-olo" />
                Account created!
              </DialogTitle>
              <DialogDescription>
                <strong>{name}</strong> can now sign in with:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-olo/10 border border-olo/20 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Username</p>
                <p className="font-semibold text-olo text-lg">{username.trim().toLowerCase()}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Your child can sign in from any device using this username and the password you set. They can also be made a family admin.
              </p>
              <Button onClick={handleClose} className="w-full h-11">
                <Check className="w-4 h-4 mr-2" /> Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}