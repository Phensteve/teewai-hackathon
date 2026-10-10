import { useEffect, useState } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import { Radio, Loader2, RefreshCw, Camera } from 'lucide-react';

// Real-time view of users currently scanning. Polls the backend every 5s for
// scans in the "analyzing" state (created in the last 5 minutes). A scan
// record is created with status "analyzing" the moment a user uploads a photo,
// then updated to "completed" with the result — so this panel reflects who is
// mid-scan right now.
export default function LiveScans() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await adminAuth.liveScans();
      setData(res);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load live scans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const live = data?.live || [];
  const count = data?.count ?? 0;

  return (
    <div className="p-6 rounded-3xl border border-border bg-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-olo animate-ping opacity-75" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-olo" />
          </span>
          <Radio className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-lg">Scanning right now</h2>
          <span className="text-xs text-muted-foreground">{count} live</span>
        </div>
        <button onClick={load} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/5 transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {loading && !data ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
      ) : error ? (
        <p className="text-sm text-destructive py-4 text-center">{error}</p>
      ) : live.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-border text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
          <Camera className="w-6 h-6 text-muted-foreground/50" />
          No one is scanning right now. Live scans appear here the moment a user starts one.
        </div>
      ) : (
        <div className="space-y-2">
          {live.map((s) => (
            <div key={s.scan_id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-background">
              <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center text-olo font-semibold flex-shrink-0">
                {(s.name || s.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{s.name || '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{s.email || '—'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-medium text-olo capitalize">{s.position || 'scan'}</p>
                <p className="text-[11px] text-muted-foreground">{s.seconds_ago < 60 ? `${s.seconds_ago}s ago` : `${Math.floor(s.seconds_ago / 60)}m ago`}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-3">Updates every 5 seconds. Scans in progress show here until they complete.</p>
    </div>
  );
}