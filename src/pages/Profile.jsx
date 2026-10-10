import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Camera, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { scans as insforgeScans } from '@/lib/insforgeDb';

export default function Profile() {
  const { user } = useAuth();
  const [scanCount, setScanCount] = useState(null);

  useEffect(() => {
    insforgeScans
      .list('-created_date', 100)
      .then((rows) => setScanCount(rows.length))
      .catch(() => setScanCount(0));
  }, []);

  const handleLogout = async () => {
    const { unrufld } = await import('@/api/unrufldClient');
    unrufld.auth.logout('/login');
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-heading text-2xl font-700 tracking-tight">Profile</h1>

      {/* Identity card */}
      <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-olo/10 text-olo">
          <User className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-base font-700">
            {user?.full_name || 'teewai member'}
          </p>
          <p className="flex items-center gap-1.5 truncate text-caption text-muted-foreground">
            <Mail className="h-3 w-3" />
            {user?.email || '—'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-label text-muted-foreground">Total scans</p>
          <p className="mt-1 font-heading text-2xl font-700 tabular-nums text-olo">
            {scanCount === null ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : scanCount}
          </p>
        </div>
        <Link
          to="/scan"
          className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 text-center transition-colors hover:bg-muted/40"
        >
          <Camera className="mb-1 h-5 w-5 text-olo" />
          <p className="text-caption font-medium">New scan</p>
        </Link>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>

      <p className="text-center text-label text-muted-foreground">
        teewai is a wellness companion, not a medical device.
      </p>
    </div>
  );
}