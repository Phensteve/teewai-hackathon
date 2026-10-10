import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { History, Camera, RotateCcw, WifiOff, Stethoscope } from 'lucide-react';
import { useAllScans, ALL_SCANS_KEY } from '@/hooks/use-scans';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ensureBaseline } from '@/lib/baseline';
import { isNativeApp } from '@/lib/isNativeApp';
import PullToRefresh from '@/components/PullToRefresh';
import StuckScanCard from '@/components/StuckScanCard';
import MyScanRow from '@/components/MyScanRow';
import BracesScanRow from '@/components/BracesScanRow';
import PageSkeleton from '@/components/loading/PageSkeleton';

const CACHE_KEY = 'teewai:my-scans:cache';

export default function MyScans() {
  const queryClient = useQueryClient();
  const isAPK = isNativeApp();

  // APK offline fallback: seed the query with the last cached list so the
  // history renders instantly even with no connection. Web gets no initialData
  // so a first-load failure shows the normal retry error (matching old behavior).
  const initialScans = useMemo(() => {
    if (!isAPK) return undefined;
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') || undefined;
    } catch {
      return undefined;
    }
  }, [isAPK]);

  const scansQuery = useAllScans({ initialData: initialScans });
  const profileQuery = useUserProfile();
  const me = profileQuery.data || null;

  const [mode, setMode] = useState('teeth');
  const [baselineScanId, setBaselineScanId] = useState(null);

  // Baseline: use the stored baseline_scan_id, or compute the smart default
  // once the profile + scans are available. Reuses the already-fetched scan
  // list (no duplicate round-trip, unlike the old code).
  const baselineDoneRef = useMemo(() => ({ done: false }), []);
  useEffect(() => {
    if (baselineDoneRef.done || !me) return;
    const scans = scansQuery.data || [];
    if (!me.baseline_scan_id && scans.length === 0) return;
    baselineDoneRef.done = true;
    let cancelled = false;
    (async () => {
      let bId = me.baseline_scan_id;
      if (!bId) bId = await ensureBaseline(me, scans);
      if (!cancelled) setBaselineScanId(bId);
    })();
    return () => {
      cancelled = true;
    };
  }, [me, scansQuery.data, baselineDoneRef]);

  // Optimistic cache updates from StuckScanCard recovery / removal.
  const handleRecovered = (updated) => {
    queryClient.setQueryData(ALL_SCANS_KEY, (prev) =>
      prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev
    );
  };
  const handleRemoved = (scanId) => {
    queryClient.setQueryData(ALL_SCANS_KEY, (prev) =>
      prev ? prev.filter((s) => s.id !== scanId) : prev
    );
  };

  const loading = scansQuery.isLoading;
  const error = scansQuery.isError && !scansQuery.data;
  const offline = scansQuery.isError && !!scansQuery.data && isAPK;

  const handleReload = () => queryClient.invalidateQueries({ queryKey: ALL_SCANS_KEY });
  const handleRefresh = async () => {
    await queryClient.refetchQueries({ queryKey: ALL_SCANS_KEY });
  };

  if (loading) return <PageSkeleton title="My scans" />;

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-soft flex items-center justify-center mx-auto mb-5">
          <WifiOff className="w-7 h-7 text-danger" />
        </div>
        <h2 className="font-heading font-700 text-xl mb-2">We couldn't load your scan history</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your scans are safe — this is usually a connection hiccup. Check your signal and reload.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleReload}
            className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow"
          >
            <RotateCcw className="w-4 h-4" /> Reload scans
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 border border-border font-medium px-5 py-2.5 rounded-xl text-sm hover:bg-accent transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const list = Array.isArray(scansQuery.data) ? scansQuery.data : [];
  const teeth = list.filter((s) => s.scan_mode !== 'braces');
  const braces = list.filter((s) => s.scan_mode === 'braces');
  // Von Restorff isolate: the latest completed scan stands out.
  const latestCompletedId = teeth.find((s) => s.status !== 'analyzing')?.id;

  return (
    <PullToRefresh onRefresh={handleRefresh} className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
          <History className="w-6 h-6 text-olo" />
        </div>
        <div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">My scans</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'teeth'
              ? `${teeth.length} scan${teeth.length === 1 ? '' : 's'}`
              : `${braces.length} check${braces.length === 1 ? '' : 's'}`}{' '}
            · newest first
          </p>
        </div>
      </div>

      {offline && (
        <div className="mb-4 p-3 rounded-xl bg-warning-soft border border-warning/20 text-warning text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" /> You're offline — showing your last saved
          scans. New scans need a connection.
        </div>
      )}

      {/* Teeth / Braces compartment tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1 mb-5">
        <button
          onClick={() => setMode('teeth')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === 'teeth'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Camera className="w-4 h-4" /> Teeth{' '}
          <span className="text-xs opacity-70">{teeth.length}</span>
        </button>
        <button
          onClick={() => setMode('braces')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === 'braces'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Stethoscope className="w-4 h-4" /> Braces{' '}
          <span className="text-xs opacity-70">{braces.length}</span>
        </button>
      </div>

      {mode === 'teeth' ? (
        teeth.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-border">
            <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-7 h-7 text-olo" />
            </div>
            <h2 className="font-heading font-600 text-lg mb-1">No scans yet</h2>
            <p className="text-muted-foreground text-sm mb-5">
              Take your first scan to start tracking your smile.
            </p>
            <Link
              to="/scan"
              className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow"
            >
              <Camera className="w-4 h-4" /> New scan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {teeth.map((s) => {
              if (s.status === 'analyzing') {
                return (
                  <StuckScanCard
                    key={s.id}
                    scan={s}
                    onRecovered={handleRecovered}
                    onRemoved={handleRemoved}
                  />
                );
              }
              return (
                <MyScanRow
                  key={s.id}
                  scan={s}
                  baselineScanId={baselineScanId}
                  latestCompletedId={latestCompletedId}
                  onSetBaseline={(sc) => setBaselineScanId(sc.id)}
                />
              );
            })}
          </div>
        )
      ) : braces.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border border-dashed border-border">
          <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-7 h-7 text-olo" />
          </div>
          <h2 className="font-heading font-600 text-lg mb-1">No braces checks yet</h2>
          <p className="text-muted-foreground text-sm mb-5">
            Screen your alignment to see if you might benefit from braces.
          </p>
          <Link
            to="/braces-check"
            className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow"
          >
            <Stethoscope className="w-4 h-4" /> Run a braces check
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {braces.map((s) => (
            <BracesScanRow key={s.id} scan={s} />
          ))}
          <Link
            to="/braces-check"
            className="flex items-center justify-center gap-2 bg-olo text-white font-semibold px-5 py-3 rounded-2xl text-sm hover:scale-[1.02] transition-transform olo-glow"
          >
            <Stethoscope className="w-4 h-4" /> Run a new check
          </Link>
        </div>
      )}
    </PullToRefresh>
  );
}