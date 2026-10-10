import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Camera, FileText, Image, Loader2, Check } from 'lucide-react';

export default function ShareScansModal({ open, dentist, patientScans, existingShares, onShare, onUnshare, onClose }) {
  const [shareTypes, setShareTypes] = useState({});
  const [toggles, setToggles] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = {};
    const st = {};
    existingShares.forEach((s) => {
      if (s.status === 'active') {
        t[s.scan_id] = true;
        st[s.scan_id] = s.share_type;
      }
    });
    setToggles(t);
    setShareTypes(st);
  }, [open, existingShares]);

  const handleToggle = (scanId, on) => {
    setToggles((p) => ({ ...p, [scanId]: on }));
    if (on && !shareTypes[scanId]) {
      setShareTypes((p) => ({ ...p, [scanId]: 'report_only' }));
    }
  };

  const handleShareTypeChange = (scanId, type) => {
    setShareTypes((p) => ({ ...p, [scanId]: type }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const scan of patientScans) {
        const isOn = toggles[scan.id];
        const existing = existingShares.find((s) => s.scan_id === scan.id && s.status === 'active');
        if (isOn && !existing) {
          await onShare(scan, shareTypes[scan.id] || 'report_only');
        } else if (!isOn && existing) {
          await onUnshare(existing);
        } else if (isOn && existing && existing.share_type !== shareTypes[scan.id]) {
          await onUnshare(existing);
          await onShare(scan, shareTypes[scan.id]);
        }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!dentist) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-olo" />
            Share scans with {dentist.full_name || dentist.clinic_name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          Select which scans to share. For each, choose whether to include photos or share the report only.
        </p>
        {patientScans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">You don't have any scans yet.</p>
        ) : (
          <div className="space-y-2">
            {patientScans.map((scan) => {
              const isOn = !!toggles[scan.id];
              const type = shareTypes[scan.id] || 'report_only';
              return (
                <div key={scan.id} className={`rounded-xl border p-3 transition-colors ${isOn ? 'border-olo/40 bg-olo/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        Scan · {scan.shade || '—'} · Score {scan.score ?? '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {scan.created_date ? new Date(scan.created_date).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <Switch checked={isOn} onCheckedChange={(v) => handleToggle(scan.id, v)} />
                  </div>
                  {isOn && (
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => handleShareTypeChange(scan.id, 'report_only')}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                          type === 'report_only' ? 'border-olo bg-olo/10 text-olo' : 'border-border text-muted-foreground hover:border-olo/30'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" /> Report only
                      </button>
                      <button
                        onClick={() => handleShareTypeChange(scan.id, 'report_and_photos')}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                          type === 'report_and_photos' ? 'border-olo bg-olo/10 text-olo' : 'border-border text-muted-foreground hover:border-olo/30'
                        }`}
                      >
                        <Image className="w-3.5 h-3.5" /> Report + photos
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-olo text-white hover:bg-olo/90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            {saving ? 'Saving…' : 'Save shares'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}