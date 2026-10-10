import { useState, useEffect } from 'react';
import { Shield, Smartphone, Clock, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { getDeviceFingerprint, generateDeviceFingerprint } from '@/lib/deviceFingerprint';
import { canResetIpMatch, IP_RESET_COOLDOWN_DAYS } from '@/lib/referral';

// Settings section for resetting the device/IP association. A user can reset
// once every 45 days per IP address. Each reset is logged to
// IpAccountMatchChange for audit.
export default function IpAccountMatchSettings() {
  const [currentHash, setCurrentHash] = useState('');
  const [canReset, setCanReset] = useState(true);
  const [nextAllowed, setNextAllowed] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const hash = await getDeviceFingerprint();
        setCurrentHash(hash.slice(0, 12) + '…');
        const me = await unrufld.auth.me();
        if (me?.id) {
          const result = await canResetIpMatch(me.id);
          setCanReset(result.canReset);
          if (result.nextAllowedDate) setNextAllowed(new Date(result.nextAllowedDate));
        }
      } catch {}
    })();
  }, []);

  const handleReset = async () => {
    setError('');
    setMessage('');
    setResetting(true);
    try {
      const me = await unrufld.auth.me();
      if (!me?.id) { setError('Not authenticated.'); setResetting(false); return; }

      const result = await canResetIpMatch(me.id);
      if (!result.canReset) {
        setError('You can only reset your device association once every 45 days.');
        setResetting(false);
        return;
      }

      const oldHash = await getDeviceFingerprint();
      const newHash = await generateDeviceFingerprint();
      const now = new Date();
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + IP_RESET_COOLDOWN_DAYS);

      await unrufld.entities.IpAccountMatchChange.create({
        user_id: me.id,
        user_email: me.email || '',
        old_device_hash: oldHash,
        new_device_hash: newHash,
        change_date: now.toISOString(),
        next_allowed_date: nextDate.toISOString(),
      });

      try { localStorage.setItem('teewai_device_hash', newHash); } catch {}
      setCurrentHash(newHash.slice(0, 12) + '…');
      setCanReset(false);
      setNextAllowed(nextDate);
      setMessage('Your device association has been reset. You can now create accounts from this device.');
    } catch (e) {
      setError(e?.message || 'Could not reset device association.');
    } finally {
      setResetting(false);
    }
  };

  const daysUntilReset = nextAllowed
    ? Math.ceil((new Date(nextAllowed) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="p-5 rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-5 h-5 text-olo" />
        <h3 className="font-heading font-700 text-base">Device & network association</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Manage your device fingerprint. Reset it if you got a new device or your network changed.
        You can reset once every {IP_RESET_COOLDOWN_DAYS} days.
      </p>

      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 mb-4">
        <Smartphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Current device hash</p>
          <p className="text-sm font-mono font-medium truncate">{currentHash || 'Loading…'}</p>
        </div>
      </div>

      {message && (
        <div className="mb-3 p-3 rounded-xl bg-success-soft border border-success/20 flex items-start gap-2">
          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
          <p className="text-sm text-success">{message}</p>
        </div>
      )}
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-danger-soft border border-danger/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {canReset ? (
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-2.5 rounded-xl hover:scale-[1.01] transition-transform disabled:opacity-50"
        >
          {resetting ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</> : <><RefreshCw className="w-4 h-4" /> Reset device association</>}
        </button>
      ) : (
        <div className="p-3 rounded-xl bg-muted/40 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Next reset available in <span className="font-semibold text-foreground">{daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}</span>
          </p>
        </div>
      )}
    </div>
  );
}