import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { unrufld } from '@/api/unrufldClient';
import { Button } from "@/components/ui/button";

import { Lock, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { authPageLink } from '@/lib/authNavigation';
import PasswordField from "@/components/auth/PasswordField";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    // Breached password check — same standard as registration. Runs under the
    // loading state so the button is disabled + spinner shows during the call.
    try {
      const pwCheck = await unrufld.functions.invoke("userAuth", { op: "checkPassword", password: newPassword });
      if (pwCheck.data && !pwCheck.data.valid) {
        const reasons = {
          too_short: "Password must be at least 8 characters",
          breached: "This password is in a known breach list. Choose something more unique.",
          pattern: "Avoid sequential or repeating patterns (1234, abcd, aaaa).",
        };
        setError(reasons[pwCheck.data.reason] || "Choose a stronger password");
        return;
      }
    } catch {}
    try {
      await unrufld.auth.resetPassword({ resetToken, newPassword });
      // One-shot flag so the next password login clears the must_reset_password
      // requirement (set by the force-reset gate in Login).
      try { localStorage.setItem("teewai_just_reset", "1"); } catch {}
      const login = new URL(authPageLink('/login'), window.location.origin);
      login.searchParams.set('reauth', '1');
      window.location.replace(login.href);
      return;
    } catch (err) {
      setError(err.message || "This reset link may have expired or already been used. Request a new one if needed.");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Invalid reset link"
        subtitle="This password reset link is missing or invalid"
        footer={
          <Link to={authPageLink('/forgot-password')} replace className="text-primary font-medium hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          The link you used appears to be incomplete. Please request a new password reset email.
        </p>
      </AuthLayout>
    );
  }



  return (
    <AuthLayout
      icon={Lock}
      title="New password"
      subtitle="Enter your new password below"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-soft border border-danger/20 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          id="password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          autoFocus
        />
        <PasswordField
          id="confirm"
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}