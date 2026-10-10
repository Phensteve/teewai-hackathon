import React, { useState } from "react";
import { Link } from "react-router-dom";
import { unrufld } from '@/api/unrufldClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { authPageLink, rememberAuthDestination } from '@/lib/authNavigation';
import BackButton from '@/components/BackButton';

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    rememberAuthDestination();
    setError("");
    setLoading(true);
    // Rate limit password reset requests — prevents email bombing
    try {
      const rl = await unrufld.functions.invoke("userAuth", { op: "checkRate", type: "reset", key: email.trim().toLowerCase() });
      if (rl.data?.blocked) {
        const mins = Math.ceil((rl.data.retryAfter || 3600) / 60);
        setError(`Too many reset requests. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`);
        setLoading(false);
        return;
      }
    } catch {}
    try {
      await unrufld.auth.resetPasswordRequest(email);
      unrufld.functions.invoke("userAuth", { op: "logAttempt", type: "reset", key: email.trim().toLowerCase() }).catch(() => {});
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Reset password"
      subtitle="We'll send you a link to reset it"
      footer={
        <Link to={authPageLink('/login')} replace className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to log in
        </Link>
      }
    >
      <BackButton compact className="mb-4" />
      {sent ? (
        <p className="text-sm text-foreground text-center">
          If an account exists with that email, you'll receive a password reset link shortly.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 text-base"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}