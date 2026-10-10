import { useEffect, useState } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';
import { Loader2 } from 'lucide-react';

export default function Admin() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    adminAuth
      .me()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false));
  }, []);

  // React to a logout in another tab immediately, instead of waiting for the
  // next admin API call to fail.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'teewai_admin_token' && !e.newValue) setAuthed(false);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-olo-deep safe-area-inset-top">
        <Loader2 className="w-8 h-8 text-olo animate-spin" />
      </div>
    );
  }

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;
  return (
    <AdminDashboard
      onLogout={() => {
        adminAuth.logout();
        setAuthed(false);
      }}
    />
  );
}