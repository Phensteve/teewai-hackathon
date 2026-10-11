import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, TrendingUp, History, ArrowRight, Loader2 } from 'lucide-react';
import { scans as insforgeScans } from '@/lib/insforgeDb';
import { useScanPhotos } from '@/hooks/use-scan-photo';
import { useAuth } from '@/lib/AuthContext';

function timeAgo(dateStr) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [scans, setScans] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    insforgeScans
      .list('-created_date', 20)
      .then((rows) => active && setScans(rows))
      .catch(() => active && setError(true));
    return () => { active = false; };
  }, []);

  const photoMap = useScanPhotos((scans || []).map((s) => s.image_url).filter(Boolean));

  const loading = scans === null && !error;
  const latest = scans?.[0] || null;
  const totalScans = scans?.length || 0;
  const oldest = scans?.[scans.length - 1];
  const improvement = scans && scans.length >= 2 ? (latest?.score || 0) - (oldest?.score || 0) : 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-caption text-muted-foreground">Welcome back</p>
        <h1 className="font-heading text-2xl font-700 tracking-tight">
          {user?.full_name || user?.email || 'Your smile'}
        </h1>
      </div>

      {/* Primary CTA */}
      <Link
        to="/scan"
        className="group flex items-center justify-between rounded-3xl border border-olo/20 bg-gradient-to-br from-olo/10 to-card p-5 transition-transform hover:scale-[1.01]"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-olo text-white shadow-lg shadow-olo/30">
            <Camera className="h-6 w-6" />
          </span>
          <div>
            <p className="font-heading text-base font-700">New scan</p>
            <p className="text-caption text-muted-foreground">Analyze your teeth in seconds</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-olo transition-transform group-hover:translate-x-1" />
      </Link>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Whiteness" value={latest?.score != null ? Math.round(latest.score) : '—'} accent="olo" />
          <StatCard label="Health" value={latest?.dental_health_score != null ? Math.round(latest.dental_health_score) : '—'} accent="success" />
          <StatCard
            label="Change"
            value={improvement > 0 ? `+${Math.round(improvement)}` : improvement < 0 ? `${Math.round(improvement)}` : '—'}
            accent={improvement >= 0 ? 'olo' : 'warning'}
          />
        </div>
      )}

      {/* Recent scans */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-base font-700">
            <History className="h-4 w-4 text-muted-foreground" />
            Recent scans
          </h2>
          {totalScans > 0 && (
            <span className="text-caption text-muted-foreground">{totalScans} total</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-caption text-muted-foreground">
            Couldn't load your scans. Pull down or try again.
          </div>
        ) : totalScans === 0 ? (
          <Link
            to="/scan"
            className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-8 text-center transition-colors hover:bg-muted/40"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-olo/10 text-olo">
              <Camera className="h-6 w-6" />
            </span>
            <p className="font-heading text-sm font-600">No scans yet</p>
            <p className="text-caption text-muted-foreground">Take your first scan to see your smile score.</p>
          </Link>
        ) : (
          <div className="space-y-2">
            {scans.map((scan) => (
              <Link
                key={scan.id}
                to={`/results/${scan.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-olo-deep">
                  {photoMap[scan.image_url] ? (
                    <img src={photoMap[scan.image_url]} alt="scan" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {scan.shade || 'Scan'} · {scan.status === 'analyzing' ? 'Analyzing…' : `${Math.round(scan.score || 0)} whiteness`}
                  </p>
                  <p className="text-caption text-muted-foreground">{timeAgo(scan.created_date)}</p>
                </div>
                {scan.dental_health_score != null && (
                  <span className="rounded-full bg-success/10 px-2 py-1 text-caption font-semibold text-success tabular-nums">
                    {Math.round(scan.dental_health_score)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const tone = accent === 'olo' ? 'text-olo' : accent === 'success' ? 'text-success' : 'text-warning';
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <p className="text-label text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-2xl font-700 tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}