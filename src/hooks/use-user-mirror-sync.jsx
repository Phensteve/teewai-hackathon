import { useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { syncUserToMirror } from '@/lib/insforgeDb';

// Keep a portable copy of the current user's Base44 profile in InsForge so the
// dataset can be re-homed on another platform. Throttled to once per 24h per
// device to avoid overhead. Passwords are never synced (no auth provider
// exposes them) — pair with a passwordless login on the new platform instead.
const KEY = 'teewai_mirror_synced_at';
const THROTTLE_MS = 24 * 60 * 60 * 1000;

export function useUserMirrorSync() {
  useEffect(() => {
    (async () => {
      try {
        const last = Number(localStorage.getItem(KEY) || 0);
        if (Date.now() - last < THROTTLE_MS) return;
        const me = await unrufld.auth.me();
        if (!me?.id) return;
        await syncUserToMirror(me);
        localStorage.setItem(KEY, String(Date.now()));
      } catch {}
    })();
  }, []);
}