import { useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { useAuth } from '@/lib/AuthContext';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';

// Once per session: link this device to the signed-in account and refresh
// its paid status for the per-device free account limit.
export default function DeviceSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const key = `teewai_device_synced_${user.id}`;
    if (sessionStorage.getItem(key)) return;
    getDeviceFingerprint()
      .then((device_hash) => unrufld.functions.invoke('syncDevice', { device_hash }))
      .then(() => sessionStorage.setItem(key, '1'))
      .catch(() => {});
  }, [user?.id]);
  return null;
}