import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import { Link2, Unlink, Image as ImageIcon, Camera, Utensils, Loader2, RefreshCw, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }); } catch { return iso; }
};
const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};
const shortKey = (k) => (k && k.length > 32 ? `${k.slice(0, 15)}…${k.slice(-14)}` : k);
const thumbKey = (bucket, key) => `${bucket}:${key}`;

// One scan = one row, expandable to reveal every photo it owns (full scans
// show all their angles). Thumbnails are fetched on expand via the admin
// photo viewer so the admin can actually see every user's scans + orphans.
function ScanRow({ scan, expanded, onToggle, thumbs }) {
  const photoKeys = scan.photo_keys || [];
  return (
    <>
      <tr onClick={onToggle} className="border-t border-border cursor-pointer hover:bg-muted/30">
        <td className="px-3 py-2"><ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} /></td>
        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(scan.created_at)}</td>
        <td className="px-3 py-2 text-foreground truncate max-w-[140px]">{scan.user_label || '—'}</td>
        <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">{scan.scan_type}</span></td>
        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${scan.status === 'completed' ? 'bg-olo/10 text-olo' : 'bg-warning/10 text-warning'}`}>{scan.status}</span></td>
        <td className="px-3 py-2 text-muted-foreground">{scan.score ?? '—'}</td>
        <td className="px-3 py-2 text-right text-muted-foreground">{scan.photo_count}</td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-3 py-3">
            {photoKeys.length === 0 ? (
              <p className="text-xs text-muted-foreground">No photos attached to this scan.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {photoKeys.map((k) => {
                  const url = thumbs[thumbKey('teeth-scans', k)];
                  return (
                    <a key={k} href={url || '#'} target="_blank" rel="noopener noreferrer" className="block" title={k}>
                      {url ? (
                        <img src={url} alt={k} className="w-16 h-16 rounded-lg object-cover border border-border hover:border-olo transition-colors" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-card border border-border flex items-center justify-center"><Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /></div>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function FoodLogRow({ log, thumbs, fetchThumbs }) {
  const bucket = 'food-scans';
  const k = log.photo_key;
  const url = k ? thumbs[thumbKey(bucket, k)] : null;
  useEffect(() => {
    if (k && !url) fetchThumbs([{ bucket, key: k }]);
  }, [k, url, fetchThumbs]);
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(log.created_at)}</td>
      <td className="px-3 py-2 text-foreground truncate max-w-[140px]">{log.user_label || '—'}</td>
      <td className="px-3 py-2 text-foreground">{log.item_name || '—'}</td>
      <td className="px-3 py-2">
        {k ? (
          url ? (
            <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={k} className="w-12 h-12 rounded-lg object-cover border border-border hover:border-olo transition-colors" /></a>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"><Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" /></div>
          )
        ) : '—'}
      </td>
      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${log.is_insforge ? 'bg-olo/10 text-olo' : 'bg-muted text-muted-foreground'}`}>{log.is_insforge ? 'InsForge' : 'Base44'}</span></td>
    </tr>
  );
}

export default function PhotoAuditTable() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('scans');
  const [linking, setLinking] = useState(false);
  const [linkResult, setLinkResult] = useState(null);
  const [thumbs, setThumbs] = useState({});
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [expandedScan, setExpandedScan] = useState(null);
  const [unlinkedLoaded, setUnlinkedLoaded] = useState(false);
  const thumbsRef = useRef({});
  thumbsRef.current = thumbs;

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await adminAuth.photoScanAudit();
      setData(res);
      setThumbs({}); setExpandedScan(null); setUnlinkedLoaded(false);
    } catch (e) {
      setError(e.message || 'Failed to load audit');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const fetchThumbs = useCallback(async (photos) => {
    if (!photos || !photos.length) return;
    const need = photos.filter((p) => p && p.bucket && p.key && !thumbsRef.current[thumbKey(p.bucket, p.key)]);
    if (!need.length) return;
    setLoadingThumbs(true);
    try {
      const res = await adminAuth.viewPhotos(need);
      if (res?.dataUrls) setThumbs((prev) => ({ ...prev, ...res.dataUrls }));
    } catch {} finally { setLoadingThumbs(false); }
  }, []);

  const linkOrphans = async () => {
    setLinking(true); setLinkResult(null);
    try {
      const res = await adminAuth.linkOrphanedPhotos();
      setLinkResult(res);
      await load();
    } catch (e) {
      setLinkResult({ error: e.message || 'Linking failed' });
    } finally { setLinking(false); }
  };

  // Auto-load thumbnails for the unlinked (orphan) photos when that tab opens.
  useEffect(() => {
    if (view === 'unlinked' && data?.unlinked?.length && !unlinkedLoaded) {
      setUnlinkedLoaded(true);
      fetchThumbs(data.unlinked.map((p) => ({ bucket: p.bucket, key: p.key })));
    }
  }, [view, data, unlinkedLoaded, fetchThumbs]);

  const toggleScan = (scanId) => {
    if (expandedScan === scanId) { setExpandedScan(null); return; }
    setExpandedScan(scanId);
    const scan = (data?.scans || []).find((s) => s.id === scanId);
    if (scan) fetchThumbs((scan.photo_keys || []).map((key) => ({ bucket: 'teeth-scans', key })));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-olo animate-spin" /></div>;
  }
  if (error) {
    return <div className="p-4 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>;
  }

  const t = data?.totals || {};
  const scans = data?.scans || [];
  const foodLogs = data?.food_logs || [];
  const photos = data?.photos || [];
  const unlinked = data?.unlinked || [];

  const StatCard = ({ icon: Icon, label, value, tone }) => (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tone || 'bg-olo/10 text-olo'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground leading-none">{label}</p>
        <p className="font-heading font-700 text-lg leading-tight">{value}</p>
      </div>
    </div>
  );

  const Tab = ({ id, label, count }) => (
    <button
      onClick={() => setView(id)}
      className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${view === id ? 'bg-olo text-white' : 'bg-card border border-border text-muted-foreground hover:border-olo/40'}`}
    >
      {label}{count != null ? ` (${count})` : ''}
    </button>
  );

  const Th = ({ children, className = '' }) => (
    <th className={`text-left font-medium px-3 py-2 text-muted-foreground bg-muted/50 ${className}`}>{children}</th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ImageIcon className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-700 text-lg">Photo × Scan audit</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Every storage object cross-referenced against every scan and food log. Click a scan row to see its photos. Unlinked photos are orphans from deleted or failed scans.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <StatCard icon={Camera} label="Scans" value={t.scans ?? 0} />
        <StatCard icon={Utensils} label="Food logs (photo)" value={t.food_logs ?? 0} />
        <StatCard icon={ImageIcon} label="Photos" value={t.photos ?? 0} />
        <StatCard icon={Link2} label="Linked" value={t.linked ?? 0} tone="bg-olo/10 text-olo" />
        <StatCard icon={Unlink} label="Unlinked" value={t.unlinked ?? 0} tone="bg-warning/10 text-warning" />
      </div>

      {unlinked.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-warning/10 border border-warning/20">
          <Unlink className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-xs text-warning flex-1">
            {unlinked.length} unlinked photo{unlinked.length === 1 ? '' : 's'} found. Link tries to match each orphan to a scan by timestamp.
          </p>
          <button onClick={linkOrphans} disabled={linking} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-warning text-warning-foreground px-3 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-60">
            {linking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            Link orphans
          </button>
        </div>
      )}
      {linkResult && (
        <div className={`p-3 rounded-2xl text-xs ${linkResult.error ? 'bg-danger/10 text-danger' : 'bg-olo/10 text-olo'}`}>
          {linkResult.error ? linkResult.error : `Linked ${linkResult.linked} photo${linkResult.linked === 1 ? '' : 's'} to scans · ${linkResult.true_orphans} true orphan${linkResult.true_orphans === 1 ? '' : 's'} (no scan within 10 min)`}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <Tab id="scans" label="Scans" count={scans.length} />
        <Tab id="unlinked" label="Unlinked" count={unlinked.length} />
        <Tab id="food" label="Food logs" count={foodLogs.length} />
        <Tab id="photos" label="All photos" count={photos.length} />
      </div>

      {/* Scans — one row per scan, expandable to show all its photos */}
      {view === 'scans' && (
        <div className="rounded-2xl border border-border overflow-x-auto overflow-y-clip">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 admin-sticky-thead">
              <tr>
                <Th></Th>
                <Th>Date</Th>
                <Th>User</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Score</Th>
                <Th className="text-right">Photos</Th>
              </tr>
            </thead>
            <tbody>
              {scans.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No scans yet.</td></tr>
              ) : scans.map((s) => (
                <ScanRow key={s.id} scan={s} expanded={expandedScan === s.id} onToggle={() => toggleScan(s.id)} thumbs={thumbs} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unlinked — orphan photos with thumbnails */}
      {view === 'unlinked' && (
        <div className="rounded-2xl border border-border overflow-x-auto overflow-y-clip">
          {unlinked.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No unlinked photos — every object is referenced by a record.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/50 admin-sticky-thead">
                <tr>
                  <Th>Photo</Th>
                  <Th>Bucket</Th>
                  <Th>Key</Th>
                  <Th className="text-right">Size</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {unlinked.map((ph) => {
                  const url = thumbs[thumbKey(ph.bucket, ph.key)];
                  return (
                    <tr key={`${ph.bucket}:${ph.key}`} className="border-t border-border">
                      <td className="px-3 py-2">
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={ph.key} className="w-14 h-14 rounded-lg object-cover border border-border hover:border-olo transition-colors" /></a>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center"><Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /></div>
                        )}
                      </td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">{ph.bucket}</span></td>
                      <td className="px-3 py-2 font-mono text-foreground">{shortKey(ph.key)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{fmtSize(ph.size)}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(ph.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Food logs */}
      {view === 'food' && (
        <div className="rounded-2xl border border-border overflow-x-auto overflow-y-clip">
          {foodLogs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No food logs with photos yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/50 admin-sticky-thead">
                <tr>
                  <Th>Date</Th>
                  <Th>User</Th>
                  <Th>Item</Th>
                  <Th>Photo</Th>
                  <Th>Source</Th>
                </tr>
              </thead>
              <tbody>
                {foodLogs.map((l) => (
                  <FoodLogRow key={l.id} log={l} thumbs={thumbs} fetchThumbs={fetchThumbs} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* All photos */}
      {view === 'photos' && (
        <div className="rounded-2xl border border-border overflow-x-auto overflow-y-clip">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 admin-sticky-thead">
              <tr>
                <Th></Th>
                <Th>Bucket</Th>
                <Th>Key</Th>
                <Th className="text-right">Size</Th>
                <Th>Date</Th>
                <Th>Linked</Th>
              </tr>
            </thead>
            <tbody>
              {photos.map((ph) => (
                <tr key={`${ph.bucket}:${ph.key}`} className="border-t border-border">
                  <td className="px-3 py-2">{ph.linked ? <CheckCircle2 className="w-4 h-4 text-olo" /> : <XCircle className="w-4 h-4 text-warning" />}</td>
                  <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">{ph.bucket}</span></td>
                  <td className="px-3 py-2 font-mono text-foreground">{shortKey(ph.key)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{fmtSize(ph.size)}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(ph.created_at)}</td>
                  <td className="px-3 py-2">{ph.linked ? <span className="text-olo">Yes</span> : <span className="text-warning">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={load} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-olo transition-colors">
        <RefreshCw className="w-3.5 h-3.5" /> Refresh
      </button>
    </div>
  );
}