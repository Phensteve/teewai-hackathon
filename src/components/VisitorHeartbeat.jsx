import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { canTrack } from '@/lib/consent';
import { isNativeApp } from '@/lib/isNativeApp';

// Sends a heartbeat to the visitorStats backend every 30s with a persistent
// session ID (stored in localStorage). This powers the admin dashboard's live
// visitor counter + traffic graph. Mounted once in App.jsx so it runs on
// every route.
//
// Gated by cookie consent: only sets teewai_session_id and sends heartbeats
// when the user has accepted non-essential storage. If they rejected (or
// haven't decided yet), no session ID is set and no heartbeats are sent.
// Listens for teewai:consent-change so it starts/stops immediately when the
// user makes or changes their choice in the consent banner.
const KEY = 'teewai_session_id';

function getSessionId() {
  try {
    let sid = localStorage.getItem(KEY);
    if (!sid) {
      sid = 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }
}

export default function VisitorHeartbeat() {
  const location = useLocation();
  const [trackingAllowed, setTrackingAllowed] = useState(() => canTrack());
  const [native] = useState(() => isNativeApp());

  // React to consent changes from the banner without requiring a page reload.
  useEffect(() => {
    const handler = () => setTrackingAllowed(canTrack());
    window.addEventListener('teewai:consent-change', handler);
    return () => window.removeEventListener('teewai:consent-change', handler);
  }, []);

  useEffect(() => {
    // In the native/APK build, suppress all ongoing visitor tracking — IP
    // monitoring is signup-only in the APK (checkIpRegistration /
    // logIpRegistration at account creation). No heartbeats, no session ID.
    if (!trackingAllowed || native) {
      // Clean up any existing session ID when tracking is not allowed so no
      // orphaned identifier lingers and no further heartbeats can fire.
      try { localStorage.removeItem(KEY); } catch { /* */ }
      return;
    }

    const sid = getSessionId();
    const send = () => {
      unrufld.functions.invoke('visitorStats', { op: 'heartbeat', session_id: sid, path: window.location.pathname })
        .catch(() => {});
    };
    send();
    const id = setInterval(send, 30000);
    return () => clearInterval(id);
  }, [location.pathname, trackingAllowed, native]);

  return null;
}