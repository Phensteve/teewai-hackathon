import { Link } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { authPageLink, authDestination } from '@/lib/authNavigation';

export default function ExistingAccountNotice({ email, onBack }) {
  const params = new URLSearchParams({ email: email.trim(), returnTo: authDestination() });
  return (
    <AuthLayout title="Continue with your existing account" subtitle="This email is already registered. Sign in to keep your scans and progress together.">
      <p className="text-sm text-muted-foreground break-words mb-5">{email}</p>
      <Link to={`/login?${params}`} replace className="flex justify-center rounded-xl bg-primary text-primary-foreground px-5 py-3 font-semibold">Sign in to continue</Link>
      <Link to={authPageLink('/forgot-password')} replace className="block text-center text-sm text-primary mt-4">Forgot your password?</Link>
      <button type="button" onClick={onBack} className="block mx-auto mt-4 py-2 text-sm text-muted-foreground">Use a different email</button>
    </AuthLayout>
  );
}