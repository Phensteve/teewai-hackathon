import AuthLayout from '@/components/AuthLayout';
import { unrufld } from '@/api/unrufldClient';

export default function UserNotRegisteredError() {
  const restart = (path) => unrufld.auth.logout(new URL(path, window.location.origin).href);
  return (
    <AuthLayout title="Let’s get you to the right account" subtitle="We couldn’t finish sign-in with this account. If you’re new to teewai, start signup; otherwise, sign in with your existing method.">
      <button onClick={() => restart('/register')} className="w-full rounded-xl bg-primary text-primary-foreground py-3 px-5 font-semibold">Create an account</button>
      <button onClick={() => restart('/login')} className="w-full mt-3 rounded-xl border border-border py-3 px-5 font-medium">Sign in another way</button>
      <p className="mt-5 text-sm text-muted-foreground">If your account requires access approval, contact the app administrator. Signing up does not bypass access restrictions.</p>
    </AuthLayout>
  );
}