import { useState } from 'react';
import { scans as insforgeScans, deleteScan } from '@/lib/insforgeDb';
import { Camera, Loader2, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';
import ScanImage from '@/components/ScanImage';

const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 min

// Renders a scan stuck in "analyzing" status with a poll-to-recover action
// and a remove option once it's been processing long enough to be considered
// permanently stuck.
export default function StuckScanCard({ scan, onRecovered, onRemoved }) {
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [done, setDone] = useState(false);

  const ageMs = scan.created_date ? Date.now() - new Date(scan.created_date).getTime() : 0;
  const isStuck = ageMs > STUCK_THRESHOLD_MS;

  const checkNow = async () => {
    setChecking(true);
    try {
      const s = await insforgeScans.get(scan.id);
      if (s && s.status === 'completed') { onRecovered?.(s); return; }
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } finally {
      setChecking(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await deleteScan(scan.id);
      onRemoved?.(scan.id);
    } catch {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl border border-warning/30 bg-warning/5">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-olo-deep flex-shrink-0">
        {scan.image_url ? <ScanImage url={scan.image_url} alt="scan" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-white/40 m-auto" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-heading font-600 text-warning">Processing…</span>
          {scan.scan_type === 'full' && <span className="text-[10px] font-semibold text-olo bg-olo/15 px-1.5 py-0.5 rounded-full">FULL</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isStuck ? 'This scan seems stuck. You can remove it or check again.' : 'Still analyzing in the background — check back shortly.'}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={checkNow}
            disabled={checking}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-olo bg-olo/10 px-2.5 py-1.5 rounded-lg hover:bg-olo/20 transition-colors disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
            {checking ? 'Checking…' : done ? 'Not ready yet' : 'Check status'}
          </button>
          {isStuck && (
            <button
              onClick={remove}
              disabled={removing}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}